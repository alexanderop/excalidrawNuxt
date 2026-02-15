---
title: Full Mouse Interaction Parity with Excalidraw
type: feat
status: active
date: 2026-02-15
---

# Full Mouse Interaction Parity with Excalidraw

## Overview

Add complete mouse interaction parity with Excalidraw: middle mouse button panning, shift+wheel horizontal scrolling, improved zoom scaling, and proper edge case handling. Mouse-only scope (no trackpad/touch gestures).

## Problem Statement / Motivation

Currently, the only ways to pan the canvas are spacebar+drag or the hand tool. Real Excalidraw users expect middle mouse button panning as the primary navigation method — it's the fastest way to navigate without switching tools. Additionally, shift+wheel horizontal scrolling and zoom refinements are missing, making the UX feel incomplete compared to the reference.

## Current State

**What works today** (in `usePanning.ts`):

- Plain wheel scroll (pan)
- Ctrl/Meta + wheel zoom
- Spacebar + left-click drag pan
- Hand tool pan
- Cursor feedback: "grab" on hover when space/hand, "grabbing" during drag

**What's missing** (gaps vs Excalidraw):

| Feature                             | Excalidraw         | DrawVue | Priority |
| ----------------------------------- | ------------------ | ------- | -------- |
| Middle mouse button pan             | Yes (button === 1) | No      | **P0**   |
| Shift + wheel horizontal scroll     | Yes                | No      | **P0**   |
| Wheel events suppressed during pan  | Yes                | No      | **P1**   |
| Window blur cleanup for pan state   | Yes                | No      | **P1**   |
| Linux middle-click paste prevention | Yes                | No      | **P2**   |
| Zoom MAX_STEP cap                   | Yes (MAX_STEP=10)  | No      | **P2**   |
| Zoom log10 amplification            | Yes                | No      | **P3**   |

## Proposed Solution

All changes are localized to **one file**: `packages/core/src/features/canvas/composables/usePanning.ts`, with minor test additions. The `useViewport.ts` API stays unchanged.

### Phase 1: Middle Mouse Button Panning (P0)

**File: `usePanning.ts`**

Update the `pointerdown` handler (line 81-87) to also activate panning on `e.button === 1`:

```typescript
// usePanning.ts — pointerdown handler
useEventListener(canvasRef, "pointerdown", (e: PointerEvent) => {
  const isMiddleButton = e.button === 1;

  if (isMiddleButton) {
    e.preventDefault(); // prevent browser auto-scroll behavior
  }

  if (!isMiddleButton && !spaceHeld.value && activeTool.value !== "hand") return;

  isPanning.value = true;
  lastPointerX = e.clientX;
  lastPointerY = e.clientY;
  canvasRef.value?.setPointerCapture(e.pointerId);
});
```

**Why this works safely:**

- All other interaction composables (`useDrawingInteraction`, `useSelectionInteraction`, `useFreeDrawInteraction`, `useEraserInteraction`, `useMultiPointCreation`, `useLinearEditor`) already guard with `e.button !== 0`, so they reject middle-click events
- `usePanning` is registered first in `DrawVue.vue` (line 201), so `isPanning` is set to `true` synchronously before other handlers run
- The `pointermove` and `pointerup` handlers already check `isPanning.value` — no changes needed

**Cursor:** Already handled — `panningCursor` returns `"grabbing"` when `isPanning.value` is `true`. The cursor changes immediately on middle-button down (Excalidraw behavior).

### Phase 2: Shift + Wheel Horizontal Scroll (P0)

**File: `usePanning.ts`**

Add shift+wheel handling in the wheel event handler (before the plain wheel pan):

```typescript
// usePanning.ts — wheel handler
useEventListener(
  canvasRef,
  "wheel",
  (e: WheelEvent) => {
    e.preventDefault();

    if (isPanning.value) return; // suppress wheel during active pan

    if (e.ctrlKey || e.metaKey) {
      const delta = -e.deltaY * 0.01;
      zoomBy(delta, pointFrom<GlobalPoint>(e.offsetX, e.offsetY));
      return;
    }

    if (e.shiftKey) {
      // Horizontal-only scroll; use deltaY||deltaX for macOS compat
      panBy(-(e.deltaY || e.deltaX), 0);
      return;
    }

    panBy(-e.deltaX, -e.deltaY);
  },
  { passive: false },
);
```

**macOS detail:** When shift is held, macOS browsers report the vertical scroll delta as `deltaX` instead of `deltaY`. The `deltaY || deltaX` pattern (matching Excalidraw line 12095) handles both platforms.

### Phase 3: Wheel Suppression During Pan & Blur Cleanup (P1)

**Wheel suppression** (already shown in Phase 2): Add `if (isPanning.value) return` at the top of the wheel handler. This prevents simultaneous pan+zoom which produces jarring viewport jumps.

**Window blur cleanup:** Add a `blur` event listener to reset pan state if the window loses focus while middle button is held:

```typescript
// usePanning.ts — blur cleanup
useEventListener(window, "blur", () => {
  if (isPanning.value) {
    isPanning.value = false;
    spaceHeld.value = false;
  }
});
```

This prevents the "stuck in panning mode" bug when Alt+Tab happens during a drag.

### Phase 4: Linux Paste Prevention & Zoom Cap (P2)

**Linux paste prevention:** On Linux, middle-click triggers a system paste event. Prevent it only when the user actually drags (not on stationary middle-click, which is a legitimate paste):

```typescript
// usePanning.ts — track if middle-button drag moved
let middleButtonMoved = false;

// In pointerdown: middleButtonMoved = false when isMiddleButton
// In pointermove: if (isPanning.value) middleButtonMoved = true

useEventListener(canvasRef, "paste", (e: ClipboardEvent) => {
  if (middleButtonMoved) {
    e.preventDefault();
  }
});
```

**Zoom MAX_STEP cap:** Cap the raw wheel delta before computing zoom to prevent huge jumps from freespin scroll wheels:

```typescript
const MAX_ZOOM_STEP = 10; // matches Excalidraw's ZOOM_STEP * 100

if (e.ctrlKey || e.metaKey) {
  const clampedDelta = Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), MAX_ZOOM_STEP);
  const delta = -clampedDelta * 0.01;
  zoomBy(delta, pointFrom<GlobalPoint>(e.offsetX, e.offsetY));
  return;
}
```

### Phase 5 (Optional, P3): Zoom Log10 Amplification

Excalidraw adds a log10-based amplification at higher zoom levels for smoother feel. This is a minor UX polish that can be deferred:

```typescript
// Optional: log10 amplification (only above 100% zoom)
let newZoom = zoom.value - clampedDelta / 100;
newZoom +=
  Math.log10(Math.max(1, zoom.value)) *
  -Math.sign(clampedDelta) *
  Math.min(1, Math.abs(clampedDelta) / 20);
```

This would require calling `zoomTo` directly instead of `zoomBy`, since the formula is additive rather than multiplicative. **Recommend deferring** unless zoom UX is noticeably worse than Excalidraw.

## Technical Considerations

### Event Listener Ordering

`usePanning` is called at `DrawVue.vue:201`, before all other interaction composables (~line 322+). This means its `pointerdown` handler fires first and sets `isPanning = true` synchronously. Other composables see the updated value in their handlers. This is correct and must not change.

### Pointer Capture

The current approach uses `setPointerCapture` on the canvas for all panning modes (space-drag, hand tool, and now middle-button). This is simpler than Excalidraw's approach (which uses global event listeners for middle-button specifically). The risk of pointer capture conflicts is low because:

- A mouse has a single `pointerId` regardless of button
- If left-button drawing is active and middle is pressed, the drawing composable has already captured the pointer, and `setPointerCapture` is a no-op for the same pointer
- On `pointerup` for middle button, `releasePointerCapture` would release the drawing's capture — but since all composables check `e.button !== 0`, the drawing's pointerup (button 0) won't fire for a middle-button release

**Safeguard:** Track which button started the pan and only release capture on that button's `pointerup`:

```typescript
let panButton: number | null = null;

// In pointerdown: panButton = e.button;
// In pointerup: if (e.button !== panButton) return;
```

### Text Editing Limitation

Middle-button pan will NOT work during WYSIWYG text editing (the text overlay captures pointer events). This matches a known limitation and can be addressed in a follow-up. Document in release notes.

### No History Impact

Panning only affects viewport (`scrollX`, `scrollY`), not elements. No undo/redo entries are created. No changes to the history system.

## Acceptance Criteria

### Functional

- [ ] Middle mouse button press + drag pans the canvas, regardless of active tool
- [ ] Middle mouse button shows "grabbing" cursor immediately on press
- [ ] Shift + scroll wheel scrolls horizontally only
- [ ] Shift + scroll wheel works on macOS (deltaX fallback)
- [ ] Scroll wheel is suppressed during active panning (no simultaneous pan+zoom)
- [ ] Window blur resets panning state (no "stuck in pan" bug)
- [ ] Right-click context menu still works (no conflict with middle button)
- [ ] All existing panning methods still work (spacebar+drag, hand tool, plain wheel)

### Testing

- [ ] Unit test: middle button press starts panning (`usePanning.unit.test.ts`)
- [ ] Unit test: middle button drag calls `panBy` with correct deltas
- [ ] Unit test: middle button release stops panning
- [ ] Unit test: middle button sets "grabbing" cursor immediately
- [ ] Unit test: shift+wheel calls `panBy` with horizontal-only delta
- [ ] Unit test: shift+wheel uses `deltaY || deltaX` fallback
- [ ] Unit test: wheel events ignored during active pan
- [ ] Unit test: blur event resets isPanning
- [ ] All existing panning tests still pass

## Dependencies & Risks

**Dependencies:** None. All changes are in `packages/core/src/features/canvas/`.

**Risks:**

- **Low:** Pointer capture conflict during simultaneous left+middle button presses. Mitigated by tracking `panButton`.
- **Low:** Text editing mode doesn't support middle-button pan. Documented as known limitation.
- **Low:** Linux paste prevention may need browser-specific testing. Deferred to P2.

## Files to Modify

| File                                                                    | Changes                                                                   |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `packages/core/src/features/canvas/composables/usePanning.ts`           | Add middle-button, shift+wheel, blur cleanup, wheel suppression, zoom cap |
| `packages/core/src/features/canvas/composables/usePanning.unit.test.ts` | Add tests for all new behaviors                                           |

## References & Research

### Internal References

- Current panning: `packages/core/src/features/canvas/composables/usePanning.ts`
- Viewport API: `packages/core/src/features/canvas/composables/useViewport.ts`
- DrawVue wiring: `packages/core/src/components/DrawVue.vue:200-206`
- Event flow docs: `docs/diagrams/event-flow.md`
- Canvas architecture: `docs/diagrams/canvas-architecture.md`
- Coordinate system: `docs/diagrams/coordinate-system.md`

### Excalidraw Reference

- Middle-button pan: `excalidraw/packages/excalidraw/components/App.tsx:7538-7639` (`handleCanvasPanUsingWheelOrSpaceDrag`)
- Wheel handler: `excalidraw/packages/excalidraw/components/App.tsx:12030-12105` (`handleWheel`)
- Button constants: `excalidraw/packages/common/src/constants.ts:36` (`POINTER_BUTTON`)
