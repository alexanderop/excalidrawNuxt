---
title: "Split Image into Individual Objects"
type: feat
status: active
date: 2026-02-15
---

# Split Image into Individual Objects

## Overview

Add a "Split into Objects" context menu action for image elements. Uses **SlimSAM** (~14MB quantized) via `@huggingface/transformers` running in-browser through a dedicated Web Worker. Automatically detects all distinct objects in the image using a grid-point sampling strategy, then creates a separate cropped image element for each detected object — placed side by side to the right of the original. The entire operation is undoable as a single transaction.

## Problem Statement / Motivation

Users often paste composite images — sticker sheets, group photos, diagrams with multiple components, collages — onto the canvas. Currently there is no way to split these into individual elements without leaving DrawVue to use external tools. A one-click "Split into Objects" action keeps users in flow, runs fully client-side (no data leaves the browser), and produces individually movable, resizable elements from a single source image.

## Proposed Solution

```
Right-click image → "Split into Objects" → lazy-load SAM → encode image → grid-point decoding → NMS → N new cropped elements
```

### Key Decisions

| Decision                  | Choice                                                    | Rationale                                                                                                    |
| ------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Trigger**               | Context menu (separate from "Remove Background")          | Different user intent; clear separation avoids confusion                                                     |
| **Model**                 | SlimSAM quantized (`Xenova/slimsam-77-uniform`, ~14MB)    | Class-agnostic (works on stickers, photos, diagrams), 100x smaller than full SAM, Transformers.js compatible |
| **Segmentation approach** | Grid-point automatic mask generation (10x10 = 100 points) | No native `mask-generation` pipeline in Transformers.js; grid approach is the standard alternative           |
| **Grid density**          | 10x10 (100 points) instead of 16x16 (256)                 | Balances coverage vs speed: ~10-20s total vs 15-50s. Misses only very small objects (<10% of image width)    |
| **Output format**         | Cropped to mask bounding box                              | Full-size outputs would waste N x original-size memory. Crops are compact and visually clean                 |
| **Placement**             | Single row, right of original, 20px gaps                  | Consistent with "Remove Background" placement pattern                                                        |
| **Worker**                | Separate `segmentation.worker.ts`                         | Different model from RMBG-1.4; keeping workers independent avoids 60MB+ in one worker                        |
| **Cancel**                | Escape key cancels, worker stays alive (model preserved)  | 10-20s operation needs an exit. Preserving model avoids re-download on retry                                 |
| **Alpha compositing**     | `Math.min(existingAlpha, maskAlpha)`                      | Preserves transparency in source images (unlike alpha replacement)                                           |

### Why SAM over DETR?

|                    | SAM (SlimSAM)                                   | DETR Panoptic                  |
| ------------------ | ----------------------------------------------- | ------------------------------ |
| **Class-agnostic** | Segments anything (stickers, custom art, logos) | Limited to ~80 COCO categories |
| **Model size**     | ~14MB quantized                                 | ~40-45MB quantized             |
| **Inference**      | ~10-20s (100 grid points)                       | ~10-30s (single pass)          |
| **Labels**         | No labels (just masks)                          | Returns category labels        |
| **Use case fit**   | Sticker sheets, collages, arbitrary content     | Photos with standard objects   |

SAM wins because the primary use case (sticker sheets, composite artwork) involves objects DETR cannot categorize.

## Technical Approach

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ @drawvue/core  (minimal changes)                            │
│                                                             │
│  useActionRegistry.ts   ← new ActionId: "image:split-objects" │
│  contextMenuItems.ts    ← new menu entry after remove-bg    │
│                                                             │
│  DrawVue.vue            ← NO CHANGES                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Nuxt App Layer  (owns all ML logic)                         │
│                                                             │
│  composables/useImageActions.ts                             │
│   ├─ registers "image:split-objects" action                 │
│   ├─ owns enabled() predicate and handler                   │
│   └─ delegates ML work to useObjectSegmentation             │
│                                                             │
│  composables/useObjectSegmentation.ts                       │
│   ├─ lazy creates segmentation Web Worker (singleton)       │
│   ├─ manages state (idle/downloading/encoding/decoding/     │
│   │  compositing/error)                                     │
│   ├─ sends raw pixel ArrayBuffer via Transferable           │
│   ├─ receives array of mask ArrayBuffers + bounding boxes   │
│   ├─ composites each mask → cropped HTMLImageElement        │
│   ├─ supports cancel via AbortController                    │
│   └─ returns ProcessedSegment[]                             │
│                                                             │
│  workers/segmentation.worker.ts                             │
│   ├─ SamModel + AutoProcessor (singleton pattern)           │
│   ├─ progress_callback for download tracking                │
│   ├─ get_image_embeddings (once per image)                  │
│   ├─ grid-point decoder loop (100 passes)                   │
│   ├─ NMS deduplication in worker                            │
│   ├─ returns filtered masks + bounding boxes                │
│   └─ supports abort signal                                  │
│                                                             │
│  features/image/ImageActions.vue                            │
│   └─ existing component, add split status to overlay        │
└─────────────────────────────────────────────────────────────┘
```

### Implementation Phases

#### Phase 1: Core — ActionId Type & Context Menu Entry

**Files to modify:**

1. **`packages/core/src/shared/useActionRegistry.ts`** — Extend `ImageActionId`:

   ```typescript
   type ImageActionId = "image:remove-background" | "image:split-objects";
   ```

2. **`packages/core/src/features/context-menu/contextMenuItems.ts`** — Add entry after remove-bg:
   ```typescript
   export const elementMenuItems: readonly ContextMenuItemDef[] = [
     // ...existing items...
     { actionId: "image:remove-background" },
     { actionId: "image:split-objects" }, // ← new (same separator group)
   ];
   ```

**Success criteria:**

- `ActionId` type includes `"image:split-objects"`
- Menu entry exists; hidden when action is not registered (existing behavior)
- All existing tests pass

#### Phase 2: Segmentation Worker

**New file: `app/workers/segmentation.worker.ts`**

Two-phase architecture matching SAM's design:

```typescript
// Phase A: Image encoding (heavy, 1-5s, done once per image)
// - Receives raw pixel ArrayBuffer via Transferable
// - Runs SamModel.get_image_embeddings()
// - Stores embedding tensor in worker memory

// Phase B: Grid-point mask decoding (light, 50-200ms per point)
// - Generates 10x10 grid of points across the image
// - Runs model({ ...embeddings, input_points, input_labels }) per point
// - SAM returns up to 3 masks per point with IoU scores
// - Accumulates all masks
// - Runs NMS: IoU threshold 0.7, min area 0.5% of image, max 30 masks
// - Returns filtered masks as ArrayBuffers + bounding boxes via Transferable
```

**Message protocol:**

```typescript
// Main → Worker
type WorkerInMessage =
  | { type: "process"; imageData: ArrayBuffer; width: number; height: number }
  | { type: "cancel" };

// Worker → Main
type WorkerOutMessage =
  | { type: "progress"; progress: { file: string; loaded: number; total: number } }
  | { type: "status"; status: "encoding" | "decoding"; current?: number; total?: number }
  | { type: "result"; masks: MaskResult[] }
  | { type: "error"; error: string }
  | { type: "cancelled" };

interface MaskResult {
  maskData: ArrayBuffer; // Uint8 mask pixels (transferred)
  bbox: { x: number; y: number; width: number; height: number }; // In original image coords
  score: number; // IoU confidence score
  area: number; // Mask area in pixels
}
```

**NMS algorithm (runs in worker):**

```
1. Collect all masks from 100 grid points (up to 300 candidates: 3 per point)
2. Sort by score descending
3. Filter: area < 0.5% of image → discard (noise)
4. Filter: area > 95% of image → discard (background mask)
5. For each remaining mask (highest score first):
   a. If IoU with any already-accepted mask > 0.7 → discard (duplicate)
   b. Otherwise → accept
6. Cap at 30 accepted masks
```

**Success criteria:**

- Worker loads SlimSAM on first message
- Model cached via browser Cache API
- Encoding runs once, decoding runs 100 times
- NMS produces distinct, non-overlapping masks
- Progress reported per decoder pass
- Cancel message terminates the decode loop (keeps model loaded)
- Masks transferred via Transferable (zero-copy)

#### Phase 3: Composable — useObjectSegmentation

**New file: `app/composables/useObjectSegmentation.ts`**

```typescript
interface ProcessedSegment {
  image: HTMLImageElement; // Cropped, transparent background
  bbox: { x: number; y: number; width: number; height: number };
  score: number;
}

interface UseObjectSegmentationReturn {
  status: Ref<SegmentationStatus>;
  progress: Ref<{ current: number; total: number } | null>;
  errorMessage: Ref<string | null>;
  segmentObjects: (img: HTMLImageElement) => Promise<ProcessedSegment[] | null>;
  cancel: () => void;
}
```

**State machine:**

```
idle → downloading → encoding → decoding → compositing → idle
                                    ↓
                                 cancelled → idle
          ↓ (any error)
        error → idle (on retry)
```

**Compositing on main thread:**
For each mask result:

1. Create OffscreenCanvas sized to the mask's bounding box
2. Draw the source image offset by `-bbox.x, -bbox.y` (crop)
3. Apply mask alpha: `Math.min(existingAlpha, maskAlpha)` per pixel
4. Convert to `HTMLImageElement` via `canvas.toDataURL("image/png")`

**Success criteria:**

- Lazy worker creation via `new URL("../workers/segmentation.worker.ts", import.meta.url)`
- Cancel aborts the decode loop, status returns to `idle`
- Worker stays alive after cancel (model preserved)
- `onUnmounted` terminates worker
- Returns `null` on error or cancel; `ProcessedSegment[]` on success

#### Phase 4: Action Registration & Handler

**Modify: `app/composables/useImageActions.ts`**

Add new action alongside existing `"image:remove-background"`:

```typescript
register([
  {
    id: "image:split-objects",
    label: "Split into Objects",
    icon: "i-lucide-grid-2x2", // or i-lucide-scissors, i-lucide-puzzle
    handler: () => void handleSplitObjects(),
    enabled: () =>
      selection.selectedElements.value.length === 1 &&
      isInitializedImageElement(selection.selectedElements.value[0]!) &&
      !selection.selectedElements.value[0]!.locked &&
      !isAnythingProcessing.value, // Gates BOTH actions
  },
]);
```

**Handler logic:**

```
1. Guard: return early if any ML operation is in progress
2. Capture element ID and get cached HTMLImageElement
3. await segmentObjects(cachedImage)  ← long async (10-20s)
4. Re-validate: element may be deleted during inference
5. If 0 segments returned → show "No distinct objects detected" toast
6. recordAction(() => {
     for each segment (i):
       - Generate fileId via toFileId(generateId())
       - imageCache.addImage(fileId, segment.image, "image/png")
       - createElement("image", x_offset, y_offset, { width, height, fileId, ... })
       - addElement(newElement)
     Select all new elements (multi-select)
     markStaticDirty()
   })
```

**Placement algorithm:**

```typescript
const GAP = 20;
let xCursor = currentEl.x + currentEl.width + GAP;

for (const segment of segments) {
  const scaleRatio = currentEl.height / originalImageHeight;
  const scaledWidth = segment.bbox.width * scaleRatio;
  const scaledHeight = segment.bbox.height * scaleRatio;

  createElement("image", xCursor, currentEl.y, {
    width: scaledWidth,
    height: scaledHeight,
    fileId: newFileId,
    status: "saved",
    scale: [1, 1],
  });

  xCursor += scaledWidth + GAP;
}
```

**Success criteria:**

- `isAnythingProcessing` disables both "Remove Background" and "Split into Objects"
- Handler captures element ID before await, re-validates after
- All new elements created in single `recordAction()` (atomic undo)
- 0 segments → user-friendly message, no element creation
- Elements placed side by side with correct dimensions

#### Phase 5: Loading State UX

**Modify: `app/features/image/ImageActions.vue`**

Extend the existing overlay to handle split-objects status:

| Phase             | Overlay text                    | Progress indicator       |
| ----------------- | ------------------------------- | ------------------------ |
| Downloading model | "Downloading AI model..."       | File-level progress bar  |
| Encoding          | "Analyzing image..."            | Indeterminate spinner    |
| Decoding          | "Detecting objects (47/100)..." | Determinate progress bar |
| Compositing       | "Creating 8 images..."          | Indeterminate spinner    |

**Cancel button:** Add an "Escape to cancel" hint to the overlay. Wire Escape key to `cancel()`.

**Success criteria:**

- Progress updates per decoder pass
- Cancel via Escape key during decoding
- Overlay follows image element during viewport changes
- Canvas remains interactive (pan, zoom) during processing

### Error Handling

| Scenario                            | User sees                                             | Recovery                           |
| ----------------------------------- | ----------------------------------------------------- | ---------------------------------- |
| Network error during model download | "Failed to download AI model. Check your connection." | Retry by clicking again            |
| Encoding fails (corrupt image)      | "Failed to analyze image."                            | Try different image                |
| Decoder OOM                         | "Segmentation failed. Try a smaller image."           | Retry with smaller image           |
| Worker crashes                      | "Segmentation failed unexpectedly."                   | Worker re-created on next attempt  |
| Zero objects detected               | "No distinct objects detected in this image."         | Not an error — operation succeeded |
| 1 object detected                   | Single new element created (effectively bg removal)   | Normal behavior                    |
| Element deleted during inference    | Handler returns early (re-validation)                 | N/A                                |
| User cancels                        | "Cancelled." Status returns to idle                   | Model stays loaded for retry       |

### Memory Considerations

| Component                                   | Memory               | Notes                                  |
| ------------------------------------------- | -------------------- | -------------------------------------- |
| SlimSAM model (worker)                      | ~14MB                | Stays loaded after first use           |
| Image embedding (worker)                    | ~4MB                 | Per-image, released after decode loop  |
| 100 raw masks during NMS (worker)           | ~100MB peak          | Released after NMS filters to ≤30      |
| 30 mask ArrayBuffers (transferred)          | ~30MB                | Transferred to main thread (zero-copy) |
| N cropped PNG data URLs (main thread)       | ~0.5-2MB each        | Stored in image cache                  |
| **Worst case: 30 objects from large image** | **~80MB persistent** | 30 cached PNGs + model                 |

**Mobile budget:** 30 cropped PNGs at ~1MB each = ~30MB cache + 14MB model = ~44MB. Combined with existing canvas state and potential RMBG model (~45MB), total could reach ~100MB. Within Mobile Safari's ~1-1.5GB limit but monitor closely.

**Known limitation:** Undo does not evict orphaned image cache entries. With up to 30 entries per split, cache leaks are amplified. Document for v1; address with cache GC in v2.

### NMS Parameters (Tunable Constants)

```typescript
const NMS_CONFIG = {
  GRID_SIZE: 10, // 10x10 = 100 grid points
  IOU_THRESHOLD: 0.7, // Masks with IoU > 0.7 are considered duplicates
  MIN_AREA_RATIO: 0.005, // Masks < 0.5% of image area are noise
  MAX_AREA_RATIO: 0.95, // Masks > 95% of image area are background
  MAX_MASKS: 30, // Cap output at 30 distinct objects
  MIN_SCORE: 0.5, // Minimum IoU confidence score
} as const;
```

### Browser Compatibility

| Browser       | Status              | Notes                                            |
| ------------- | ------------------- | ------------------------------------------------ |
| Chrome 121+   | Full support        | WebGPU available for future acceleration         |
| Firefox       | Full support (WASM) | No WebGPU yet                                    |
| Safari 16.4+  | Works with caveats  | WASM only (no JSEP), `wasm.proxy = false`        |
| Mobile Safari | Works with limits   | Memory pressure; consider smaller grid on mobile |
| Mobile Chrome | Full support        | More generous memory than Safari                 |

## Acceptance Criteria

### Functional

- [ ] Right-clicking an image element shows "Split into Objects" in the context menu
- [ ] Action is hidden for non-image elements, multi-select, locked images, pending images
- [ ] Clicking "Split into Objects" runs SlimSAM inference locally in a Web Worker
- [ ] Grid-point sampling detects distinct objects without user interaction
- [ ] Each detected object becomes a new cropped image element with transparent background
- [ ] New elements are placed side by side to the right of the original with 20px gaps
- [ ] Element dimensions are proportionally scaled to match the original element's scale
- [ ] Original image element is preserved (non-destructive)
- [ ] All new elements are created in a single undo transaction
- [ ] Undo removes all new elements; redo restores them
- [ ] Model is lazy-loaded on first use and cached for subsequent sessions
- [ ] Canvas remains interactive during processing
- [ ] User can cancel via Escape key during decoding phase
- [ ] Zero objects → user-friendly "No objects detected" message
- [ ] Error states show meaningful messages with recovery hints
- [ ] Handler re-validates element existence after async inference

### Non-Functional

- [ ] SlimSAM (`@huggingface/transformers`) stays in app layer (not in `@drawvue/core`)
- [ ] Separate Web Worker from background-removal (`segmentation.worker.ts`)
- [ ] Images downscaled to max 1024px before encoding
- [ ] Image data transferred via Transferable (zero-copy)
- [ ] Mask results transferred via Transferable
- [ ] NMS runs in worker (no 100+ mask transfers to main thread)
- [ ] `isAnythingProcessing` disables both "Remove Background" and "Split into Objects"
- [ ] `env.backends.onnx.wasm.proxy = false` set in worker
- [ ] DrawVue.vue has zero new props
- [ ] Output images cropped to bounding box (not full-size with transparency)
- [ ] Alpha compositing uses `Math.min(existingAlpha, maskAlpha)` to preserve source transparency

## Testing Strategy

### Unit Tests (Core)

- `ActionId` type includes `"image:split-objects"` (compile-time check)
- Context menu inclusion: verify item appears in `elementMenuItems`

### Unit Tests (App)

- **NMS algorithm** (pure function, extracted for testing):
  - Basic: 3 non-overlapping masks → all accepted
  - Duplicate: 2 masks with IoU > 0.7 → lower score discarded
  - Noise: mask below min area → discarded
  - Background: mask above max area → discarded
  - Cap: 50 valid masks → only top 30 by score accepted
  - Empty: no masks → empty result

- **useObjectSegmentation composable** (mock worker):
  - State transitions: idle → downloading → encoding → decoding → compositing → idle
  - Cancel during decoding → status returns to idle
  - Error handling → error state with message
  - Worker re-creation after crash

- **useImageActions (split action)**:
  - `enabled()` predicate: single image, non-image, multi-select, locked, processing
  - Handler re-validation: element deleted during inference → no creation
  - Zero segments → no recordAction call
  - N segments → N elements created in single recordAction

- **Placement algorithm**:
  - 1 segment → positioned at `original.x + original.width + 20`
  - 3 segments of varying sizes → correct xCursor accumulation
  - Scale ratio from element size to original image size

### Browser Tests

- Full flow with mocked worker: insert image → right-click → "Split into Objects" → verify N new elements
- Context menu hides action for non-image elements
- Action disabled during processing
- Cancel via Escape key stops processing

## Dependencies & Risks

| Dependency/Risk                                   | Mitigation                                               |
| ------------------------------------------------- | -------------------------------------------------------- |
| `@huggingface/transformers` SlimSAM               | Already vetted for RMBG; use same version                |
| No native auto-mask-generation in Transformers.js | Custom grid-point implementation (10x10 grid)            |
| NMS complexity (custom implementation)            | Extract as pure function, test heavily                   |
| 10-20s processing time                            | Cancel mechanism, phase-specific progress                |
| Memory: 100 masks during NMS                      | NMS runs in worker; results are filtered before transfer |
| Memory: N cached PNGs on undo                     | Document as v1 limitation; cache GC in v2                |
| Safari JSEP bug                                   | Same mitigation as RMBG: `wasm.proxy = false`            |
| Concurrent operations                             | `isAnythingProcessing` gates both actions                |
| CDN availability (huggingface.co)                 | Cached after first download                              |

## Future Considerations

- **Interactive mode**: After automatic detection, let users click to add/remove objects from selection before creating elements
- **Preview overlay**: Show detected masks as colored overlays on the source image before committing
- **Auto-grouping**: Group all split results so they move as a unit
- **WebGPU acceleration**: 5-10x speedup for encoding phase on Chrome 121+
- **Adaptive grid density**: Smaller grid for large images, denser for small images
- **Encoder embedding cache**: Cache per-image to speed up re-splits (~4MB per cache entry)
- **DETR alternative**: For photos with standard objects, DETR provides labeled segments in one pass
- **Batch splitting**: Support multi-selected images (process sequentially)
- **Image cache GC**: Sweep entries not referenced by any element to reclaim undo orphan memory

## References

### Internal

- Background removal plan: `docs/plans/2026-02-15-feat-image-remove-background-plan.md`
- Action registry: `packages/core/src/shared/useActionRegistry.ts`
- Context menu items: `packages/core/src/features/context-menu/contextMenuItems.ts`
- Image cache: `packages/core/src/features/image/useImageCache.ts`
- Image types: `packages/core/src/features/image/types.ts`
- Existing worker: `app/workers/background-removal.worker.ts`
- Existing composable: `app/composables/useBackgroundRemoval.ts`
- Action registration: `app/composables/useImageActions.ts`

### External

- [SlimSAM on Hugging Face](https://huggingface.co/Xenova/slimsam-77-uniform) — quantized ONNX model for Transformers.js
- [SlimSAM paper (NeurIPS 2024)](https://github.com/czg1225/SlimSAM) — 100x compression of SAM
- [Segment Anything Web Demo](https://huggingface.co/spaces/Xenova/segment-anything-web) — reference implementation (point-prompt, not auto)
- [Transformers.js v3 docs](https://huggingface.co/docs/transformers.js/en/api/models) — SamModel API
- [SAM Automatic Mask Generation (Python)](https://huggingface.co/docs/transformers/en/tasks/mask_generation) — grid-point approach reference
- [Vite Web Worker docs](https://vite.dev/guide/features) — `new URL()` pattern
