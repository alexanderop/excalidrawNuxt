---
title: "Fix Image Split Objects — Detection Count & Garbled Compositing"
type: fix
status: active
date: 2026-02-15
---

# Fix Image Split Objects — Detection Count & Garbled Compositing

## Overview

The "Split into Objects" feature has two visible symptoms:

1. **Fewer objects detected than expected** — an image with 4 distinct hamster stickers only produces 2-3 segments
2. **Garbled/corrupted composited output** — some split images appear distorted with diagonal stripe artifacts

Root cause analysis reveals 3 interconnected bugs in the segmentation pipeline.

## Documentation-Verified Findings

Research into the [official SAM documentation](https://huggingface.co/docs/transformers/en/model_doc/sam) and [mask generation pipeline](https://huggingface.co/docs/transformers/en/tasks/mask_generation) reveals key differences between our implementation and the reference:

| Parameter                | Official SAM Pipeline          | Our Implementation    | Impact                                     |
| ------------------------ | ------------------------------ | --------------------- | ------------------------------------------ |
| `pred_iou_thresh`        | **0.88**                       | 0.5                   | We accept 2-3x more low-quality masks      |
| `stability_score_thresh` | **0.95**                       | Not implemented       | No stability filtering at all              |
| `crops_nms_thresh`       | **0.7** (bbox-based)           | 0.7 (bbox-based)      | Same, but applied to unfiltered candidates |
| `points_per_crop`        | 32                             | 100 (10x10 grid)      | More candidates → NMS under more pressure  |
| `post_process_masks`     | Upscales from model resolution | Custom `resizeMask()` | Ours works but mask dims not propagated    |

**Key insight:** The official pipeline ALSO uses bbox-based NMS at 0.7 threshold. But it works because masks reaching NMS are pre-filtered by both IoU threshold (0.88) AND stability score (0.95). Our lax 0.5 threshold floods NMS with fuzzy overlapping masks, causing false duplicate detection.

**pred_masks output:** The docs confirm `pred_masks` has shape `(batch_size, num_masks, height, width)` at **low resolution** (model internal, typically 256x256). Our code correctly resizes via `resizeMask()` to input dimensions. However, the input dimensions (`width` x `height`) are never communicated back to the main thread.

## Bug Analysis

### Bug 1: Mask dimension inference causes garbled compositing (CRITICAL)

**File:** `app/composables/useObjectSegmentation.ts:203-205`

```typescript
// Current: INFERS mask dimensions from pixel count + aspect ratio
const totalMaskPixels = maskData.length;
const maskWidth = Math.round(
  Math.sqrt(totalMaskPixels * (original.naturalWidth / original.naturalHeight)),
);
const maskHeight = Math.round(totalMaskPixels / maskWidth);
```

**Problem:** When the image is resized to max 1024px before sending to the worker, `Math.round()` can produce dimensions off by 1 pixel (e.g., 1023 instead of 1024). The alpha masking loop at line 238 uses `maskWidth` for row stride:

```typescript
const maskIdx = (y + bbox.y) * maskWidth + (x + bbox.x);
```

If `maskWidth` is off by even 1 pixel, every row shifts by an accumulating offset, producing the classic diagonal-stripe garbled output visible in the screenshot.

**Why it happens:** The worker knows the exact mask dimensions (`width` x `height` from `handleProcess` parameters) but never sends them back. The main thread guesses from `maskData.length` and the original aspect ratio.

### Bug 2: NMS drops distinct nearby objects due to missing pre-filtering (DETECTION COUNT)

**File:** `app/workers/segmentation.worker.ts:113-134`

**Two sub-problems:**

**2a. Missing stability score filtering.** The official SAM pipeline filters masks with `stability_score_thresh=0.95` before NMS. Stability score measures how much the mask changes when the binarization threshold shifts (stable masks are "confident"). Without this, our NMS receives many fuzzy/ambiguous masks whose bounding boxes are loose and overlapping.

**2b. Low IoU score threshold.** Our `score < 0.5` threshold (line 167) accepts masks the official pipeline would reject at `pred_iou_thresh=0.88`. These low-confidence masks include "group" masks spanning multiple objects. With SAM's `multimask_output=True` (3 masks per point), a grid point between two hamsters generates:

- Mask 1 (small/focused): one hamster, score ~0.85
- Mask 2 (medium): two hamsters, score ~0.90
- Mask 3 (large): broader region, score ~0.70

The medium "group" mask gets accepted first (highest score). Individual hamster bboxes overlap significantly with the group bbox (> 0.7 IoU), so they're dropped as "duplicates" — even though they represent distinct objects.

**Root cause:** Bbox IoU overestimates overlap for non-rectangular mask shapes. The official pipeline compensates with strict pre-filtering; ours does not.

### Bug 3: Placement uses wrong scale for resized images (SIZING)

**File:** `app/composables/useImageActions.ts:153`

```typescript
const scaleRatio = currentEl.height / cachedImage.naturalHeight;
const scaledW = segment.bbox.width * scaleRatio;
```

**Problem:** `segment.bbox.width` is in **mask-space** (resized to max 1024px), but `scaleRatio` maps from **original image space** to element space. For a 2048x1536 original resized to 1024x768:

- `scaleRatio = elementHeight / 1536`
- `scaledW = bboxWidth_in_1024_space * (elementHeight / 1536)` — **wrong**, misses the resize factor

Result: segments placed at ~50% their correct size (for 2x downscale). For images ≤1024px, this works correctly since mask-space = original-space.

## Proposed Fix

### Fix 1: Worker sends actual mask dimensions in MaskResult

**Files:**

- `app/workers/segmentation.types.ts` — add `maskWidth` and `maskHeight` to `MaskResult`
- `app/workers/segmentation.worker.ts` — include dimensions in `buildTransferableResults()`
- `app/composables/useObjectSegmentation.ts` — use explicit dimensions instead of inferring

```typescript
// segmentation.types.ts — updated MaskResult
export interface MaskResult {
  maskData: ArrayBuffer;
  bbox: { x: number; y: number; width: number; height: number };
  score: number;
  area: number;
  maskWidth: number; // ← NEW: actual mask grid width
  maskHeight: number; // ← NEW: actual mask grid height
}
```

```typescript
// segmentation.worker.ts — buildTransferableResults() includes dimensions
function buildTransferableResults(accepted: MaskCandidate[], width: number, height: number) {
  // ...existing code...
  results.push({
    maskData: buffer,
    bbox: mask.bbox,
    score: mask.score,
    area: mask.area,
    maskWidth: width, // ← exact dimensions from handleProcess params
    maskHeight: height,
  });
}
```

```typescript
// useObjectSegmentation.ts — compositeSingleMask() uses explicit dimensions
async function compositeSingleMask(original: HTMLImageElement, mask: MaskResult) {
  const { bbox, maskWidth, maskHeight } = mask; // ← no more inference
  const maskData = new Uint8Array(mask.maskData);
  // DELETE lines 203-205 (the Math.round inference)
  // ...rest uses maskWidth/maskHeight directly
}
```

### Fix 2: Add stability score + raise IoU threshold + use mask-pixel IoU

**File:** `app/workers/segmentation.worker.ts`

Three-part fix aligned with official SAM pipeline behavior:

**2a. Add stability score filtering** (new function in worker):

```typescript
/** Compute stability score: how much the mask changes at threshold ± offset */
function computeStabilityScore(maskData: Float32Array, threshold: number, offset: number): number {
  let highCount = 0;
  let lowCount = 0;
  let intersection = 0;

  for (let i = 0; i < maskData.length; i++) {
    const val = maskData[i]!;
    const high = val > threshold + offset;
    const low = val > threshold - offset;
    if (high) highCount++;
    if (low) lowCount++;
    if (high && low) intersection++;
  }

  const union = highCount + lowCount - intersection;
  return union === 0 ? 0 : intersection / union;
}
```

Apply in `extractMaskCandidates()` after the IoU score check:

```typescript
if (score < 0.7) continue; // Raised from 0.5 → 0.7
const stabilityScore = computeStabilityScore(finalMask, 0.5, 1.0);
if (stabilityScore < 0.85) continue; // Filter unstable masks (official uses 0.95, we use 0.85 for more recall)
```

**2b. Replace bbox IoU with mask-pixel IoU in NMS:**

```typescript
function computeMaskIoU(a: MaskCandidate, b: MaskCandidate): number {
  let intersection = 0;
  let union = 0;

  for (let i = 0; i < a.maskData.length; i++) {
    const aVal = a.maskData[i]! > 0.5;
    const bVal = b.maskData[i]! > 0.5;
    if (aVal && bVal) intersection++;
    if (aVal || bVal) union++;
  }

  return union === 0 ? 0 : intersection / union;
}
```

In `applyNMS()`:

```typescript
const isDuplicate = accepted.some((acc) => {
  // Fast reject: no bbox overlap → no mask overlap possible
  if (computeIoU(candidate.bbox, acc.bbox) === 0) return false;
  return computeMaskIoU(candidate, acc) > NMS_CONFIG.IOU_THRESHOLD;
});
```

**Why this combination works for the hamster case:**

1. Stability score filters out fuzzy "group" masks that span multiple objects (unstable at threshold shifts)
2. Raised IoU threshold (0.7) removes more low-quality candidates before NMS
3. Mask-pixel IoU correctly identifies that a group mask and an individual mask cover different pixel regions, even when their bounding boxes overlap

**2c. Update NMS_CONFIG:**

```typescript
export const NMS_CONFIG = {
  MIN_AREA_FRACTION: 0.005,
  MAX_AREA_FRACTION: 0.95,
  IOU_THRESHOLD: 0.7, // Unchanged (standard for mask-pixel IoU)
  MAX_MASKS: 30,
  GRID_SIZE: 10,
  MIN_SCORE: 0.7, // NEW: raised from 0.5 (closer to official 0.88)
  MIN_STABILITY_SCORE: 0.85, // NEW: stability score threshold
} as const;
```

**Performance note:** Mask-pixel IoU iterates over all pixels per comparison. Optimization: bbox overlap fast-reject ensures pixel IoU is only computed when bboxes actually intersect. With pre-filtering removing most bad candidates, the number of NMS comparisons is much smaller.

### Fix 3: Include resize factor in placement scaling

**File:** `app/composables/useImageActions.ts`

Propagate mask dimensions through `ProcessedSegment`:

```typescript
// useObjectSegmentation.ts — update ProcessedSegment
export interface ProcessedSegment {
  image: HTMLImageElement;
  bbox: { x: number; y: number; width: number; height: number };
  maskWidth: number; // ← propagated from MaskResult
  maskHeight: number; // ← propagated from MaskResult
}
```

```typescript
// useImageActions.ts — fixed placement scaling
// Use mask dimensions (resized input space) instead of original image dimensions
const maskHeight = segments[0]?.maskHeight ?? cachedImage.naturalHeight;
const scaleRatio = currentEl.height / maskHeight;
```

This correctly maps from mask-space → element-space for ANY image size.

## Files to Modify

| File                                       | Change                                                                                                                                                                                                                                                                 |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/workers/segmentation.types.ts`        | 1. Add `maskWidth`, `maskHeight` to `MaskResult` 2. Add `MIN_SCORE`, `MIN_STABILITY_SCORE` to `NMS_CONFIG`                                                                                                                                                             |
| `app/workers/segmentation.worker.ts`       | 1. Pass width/height to `buildTransferableResults()` 2. Add `computeStabilityScore()` 3. Add stability score + raised threshold filtering in `extractMaskCandidates()` 4. Add `computeMaskIoU()` 5. Replace bbox IoU with mask-pixel IoU + fast-reject in `applyNMS()` |
| `app/composables/useObjectSegmentation.ts` | 1. Remove mask dimension inference (lines 203-205) 2. Use `mask.maskWidth`/`mask.maskHeight` directly in compositing 3. Propagate mask dimensions to `ProcessedSegment`                                                                                                |
| `app/composables/useImageActions.ts`       | Fix `scaleRatio` to use `maskHeight` instead of `cachedImage.naturalHeight`                                                                                                                                                                                            |

## Acceptance Criteria

- [ ] An image with 4 visually distinct objects (e.g., hamster stickers) produces 4 separate images
- [ ] All composited output images are visually clean (no garbled/diagonal artifacts)
- [ ] Output segment sizes are proportional to the original element size, regardless of image resolution
- [ ] Existing behavior preserved: NMS still deduplicates truly redundant masks
- [ ] Small objects (> 0.5% of image area) are still detected
- [ ] Performance: NMS with mask-pixel IoU + fast-reject completes in < 2s for 1024x1024 images
- [ ] Images ≤1024px (no resize) continue to work correctly

## Testing

- Manually test with the hamster sticker image (should produce 4 segments)
- Test with a single-object image (should produce 1 segment)
- Test with a high-resolution image (> 2048px) to verify correct sizing
- Test with overlapping objects to verify NMS still deduplicates actual duplicates
- Verify undo/redo still works as a single transaction

## References

### Internal

- Original plan: `docs/plans/2026-02-15-feat-image-split-into-objects-plan.md`
- Segmentation worker: `app/workers/segmentation.worker.ts`
- Compositing: `app/composables/useObjectSegmentation.ts:193-264`
- Placement: `app/composables/useImageActions.ts:151-177`

### External (docs verified)

- [SAM Model Documentation](https://huggingface.co/docs/transformers/en/model_doc/sam) — `pred_masks` output format, `post_process_masks`, `filter_masks` parameters
- [Mask Generation Task Guide](https://huggingface.co/docs/transformers/en/tasks/mask_generation) — official pipeline parameters: `pred_iou_thresh=0.88`, `stability_score_thresh=0.95`, `crops_nms_thresh=0.7`
- [Mask Generation Pipeline Source](https://github.com/huggingface/transformers/blob/main/src/transformers/pipelines/mask_generation.py) — three-stage filtering: resize → filter (iou + stability) → NMS
