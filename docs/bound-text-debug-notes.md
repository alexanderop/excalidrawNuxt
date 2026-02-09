# Bound Text Debug Notes

## Status: In Progress

Feature: Double-click on shape to add/edit bound text.
Implementation is done but screenshot tests show text not rendering inside shapes.

## Root Cause Found

**The CanvasGrid assumes 1280x720 canvas but the actual test canvas is 300x150 CSS pixels (DPR=2).**

Debug output from browser test:
```json
{"cssW":300,"cssH":150,"backW":300,"backH":150,"dpr":2}
```

The `CanvasGrid` class hardcodes `canvasWidth=1280, canvasHeight=720`, so all computed pixel coordinates are wildly off. The dblclick lands at scene (480, 320) but the rectangle element is at (140, 100, 200, 120) — completely outside the shape.

This means ALL grid-based dblclick/click tests target wrong coordinates, causing:
- `getElementAtPosition` returns `null` (miss)
- Text is created as **standalone** (not bound to shape)
- Text renders at wrong position or off-screen

## Fixes Already Applied (keep these)

### 1. `createElement` override ordering (CRITICAL)
**File**: `app/features/elements/createElement.ts`

Text-specific defaults (`containerId: null`, `textAlign: 'left'`, etc.) were overwriting caller overrides. Fixed by adding `...overrides` at the end of the text branch so overrides like `containerId`, `textAlign: 'center'` are preserved.

### 2. `stopPropagation` on textarea keydown
**File**: `app/features/tools/useTextInteraction.ts`

Added `e.stopPropagation()` to the textarea's keydown handler so keyboard events (Escape, Backspace, etc.) don't bubble to document-level handlers like `useSelectionInteraction.handleKeyDown`.

### 3. Focus restoration after textarea removal
**File**: `app/features/tools/useTextInteraction.ts`

Added `canvasRef.value?.focus()` after `textarea.remove()` in `submitAndClose` so keyboard events (Delete, arrow keys) work after closing the text editor.

### 4. Tool guard on dblclick handler
**File**: `app/features/tools/useTextInteraction.ts`

Added `if (activeTool.value !== 'selection' && activeTool.value !== 'text') return` to prevent text creation when using other tools (rectangle, arrow, etc.).

## TODO: Fix the test

The `CanvasGrid` needs to use the actual canvas CSS dimensions instead of hardcoded 1280x720. Options:
1. Query `canvas.clientWidth/clientHeight` at runtime in the grid
2. Set the test viewport size explicitly in vitest browser config (Playwright `page.setViewportSize`)
3. Make the test container fill the viewport properly (the setup-browser.ts sets `body > div { height: 100%; width: 100% }` but the canvas ends up 300x150)

The 300x150 size is the **default HTML canvas element size** — this means `useElementSize(containerRef)` is returning 0 or the container isn't sized properly, causing the canvas to fall back to its intrinsic 300x150.

**Likely fix**: The `setup-browser.ts` styles `body > div` but the render might create additional wrapper divs. Need to ensure the CanvasContainer's parent fills the viewport.

## TODO: Verify the feature works manually

Run `bun dev`, draw a rectangle, double-click it, type text, press Escape. Verify:
- Text appears centered inside the shape
- Text alignment is `center` (not left-aligned)
- Double-click again re-opens editor with existing text
- Empty submit deletes the bound text
- Deleting the shape also deletes bound text
- Dragging/resizing the shape moves/reflows the text

## Files Modified

| File | Change |
|---|---|
| `app/features/elements/createElement.ts` | `...overrides` at end of text branch |
| `app/features/tools/useTextInteraction.ts` | Tool guard, stopPropagation, focus restore, debug logs (REMOVE) |
| `app/features/tools/boundText.browser.test.ts` | Debug log (REMOVE) |
| `app/features/binding/boundText.ts` | Bound text lifecycle functions (done) |
| `app/features/binding/index.ts` | Exports (done) |
| `app/features/selection/hitTest.ts` | Skip bound text in hit testing (done) |
| `app/features/selection/composables/useSelectionInteraction.ts` | Cascading updates + keydown guard (done) |
| `app/features/canvas/components/CanvasContainer.vue` | Wired new options (done) |

## Debug Logs to Remove

Before committing, remove these temporary console.logs:
- `useTextInteraction.ts`: `[DBG dblclick]` log in dblclick handler
- `useTextInteraction.ts`: `[DBG submit]` log in submitAndClose
- `boundText.browser.test.ts`: `[DBG canvas]` dimension log
