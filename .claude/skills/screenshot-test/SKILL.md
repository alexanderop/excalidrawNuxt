---
name: screenshot-test
description: Add a screenshot (visual regression) browser test for a canvas feature. Use when asked to "add a screenshot test for X", "visual test for X", "screenshot test X", "add a browser test with screenshots", or when the user wants to verify how something renders on the canvas.
---

# Screenshot Test Generator

Generate visual regression browser tests that verify canvas rendering by simulating real user interactions and comparing screenshots against baselines.

## Core Principles

1. **Test like a user** — every test simulates what a real user would do: select a tool via keyboard shortcut, drag on the canvas to draw, click to select. Never manipulate internal state directly.
2. **Grid coordinates** — use the `CanvasGrid` cell system for readable, maintainable positions instead of raw pixel values. The default grid is 16x9 on a 1280x720 canvas (80x80px cells).
3. **Deterministic rendering** — RoughJS uses `Math.random()` for hand-drawn stroke variations. `CanvasPage.create()` seeds it deterministically so screenshots are pixel-identical across runs.
4. **Wait for paint** — the canvas render pipeline is async (ResizeObserver -> watch -> RAF -> paint). `CanvasPage.create()` waits for canvas ready. Use `waitForPaint()` after drawing before screenshotting.

## File Placement

Place the test file next to the feature code it tests:

```
app/features/{feature}/
  {feature}.browser.test.ts          # <- the test file
  __screenshots__/
    {feature}.browser.test.ts/       # <- auto-created by vitest
      {name}-chromium-darwin.png     # <- baseline screenshots
```

## Test Template

```typescript
import { page as vitestPage } from "vitest/browser";
import { CanvasPage } from "~/__test-utils__/browser";
import { waitForPaint } from "~/__test-utils__/browser/waiters";

describe("{feature name} rendering", () => {
  it("{describes what the user sees}", async () => {
    const page = await CanvasPage.create();

    // Simulate user actions using grid cells
    await page.canvas.createElementAtCells("rectangle", [2, 2], [6, 5]);
    await waitForPaint();

    await expect(vitestPage.getByTestId("canvas-container")).toMatchScreenshot(
      "{descriptive-name}",
    );
  });
});
```

`CanvasPage.create()` handles everything: `reseed()` → `render(CanvasContainer)` → `waitForCanvasReady()` → cleanup via `onTestFinished`. No `beforeEach`/`afterEach` needed.

## Available User Actions

### Drawing elements (via `CanvasPage`)

```typescript
const page = await CanvasPage.create();

// Draw using grid cells (preferred — readable and maintainable)
await page.canvas.createElementAtCells("rectangle", [1, 1], [4, 3]);
await page.canvas.createElementAtCells("diamond", [5, 1], [8, 3]);
await page.canvas.createElementAtCells("ellipse", [1, 4], [4, 6]);
await page.canvas.createElementAtCells("arrow", [5, 5], [8, 5]);

// Draw and get a live accessor to the created element
const { id, get } = await page.canvas.createElement("rectangle", [2, 2], [5, 5]);

// Draw using raw pixel coords (only when precise positioning matters for screenshots)
await page.canvas.pointer.drag(100, 100, 300, 250);
```

### Tool selection

```typescript
await page.toolbar.select("rectangle"); // shortcut '2'
await page.toolbar.select("diamond"); // shortcut '3'
await page.toolbar.select("ellipse"); // shortcut '4'
await page.toolbar.select("arrow"); // shortcut 'a'
await page.toolbar.select("line"); // shortcut 'l'
await page.toolbar.select("text"); // shortcut 't'
await page.toolbar.select("code"); // shortcut 'c'
await page.toolbar.select("selection"); // shortcut '1'
await page.toolbar.select("hand"); // shortcut 'h'
```

### Clicking and dragging on canvas

```typescript
// Grid-based (preferred)
await page.canvas.click([3, 3]);
await page.canvas.click([3, 3], { shiftKey: true }); // with modifier
await page.canvas.draw([1, 1], [4, 4]); // raw drag between cells
await page.canvas.clickCenter([2, 2], [5, 5]); // click center of region
await page.canvas.dblClick([3, 3]);

// Raw pixel access (when needed for precise screenshot positions)
await page.canvas.pointer.clickAt(200, 150);
await page.canvas.pointer.drag(100, 100, 300, 250);
```

### Selection

```typescript
await page.selection.clickElement(element);
await page.selection.shiftClickElement(element);
await page.selection.boxSelect([0, 0], [8, 4]);
page.selection.clear();
page.selection.expectSelected(id1, id2);
page.selection.expectNoneSelected();
```

### Scene (programmatic setup)

```typescript
const el = page.scene.addElement({ x: 50, width: 80 });
await page.scene.flush(); // markStaticDirty + waitForPaint
page.scene.expectElementCount(2);
page.scene.expectElementType(0, "rectangle");
```

### Keyboard input

```typescript
await page.keyboard.press("{Delete}");
await page.keyboard.withModifierKeys({ ctrlKey: true }, async () => {
  await page.keyboard.press("g"); // Ctrl+G (group)
});
await page.keyboard.undo(); // Ctrl+Z
await page.keyboard.redo(); // Ctrl+Shift+Z
```

### Tool state assertions

```typescript
await page.toolbar.expectActive("selection"); // checks aria-pressed="true"
```

## Grid Coordinate System

The `CanvasGrid` divides a 1280x720 canvas into a 16x9 grid of 80x80px cells.

```
Cell [0,0] = top-left      → pixel center (40, 40)
Cell [15,8] = bottom-right  → pixel center (1240, 680)
Cell [col, row]             → pixel center ((col+0.5)*80, (row+0.5)*80)
```

Use grid cells for element placement to make tests self-documenting:

```typescript
// Clear layout: two shapes side by side
await page.canvas.createElementAtCells("rectangle", [1, 1], [4, 3]); // left shape
await page.canvas.createElementAtCells("diamond", [5, 1], [8, 3]); // right shape
```

### Debug overlay

When debugging, inject a visible grid:

```typescript
await page.canvas.grid.showOverlay(10000); // shows red grid lines for 10 seconds
```

## Critical Rules

1. **Use `CanvasPage.create()`** — it handles seeding, rendering, and cleanup. No manual `reseed()`/`restoreSeed()` or `beforeEach`/`afterEach` needed.
2. **Always `waitForPaint()`** (one RAF) after drawing before taking a screenshot — the render pipeline is async.
3. **Never use `page.mouse`** — iframe coordinate translation causes silent mismatches. Use `page.canvas.pointer` or `page.canvas.grid` which dispatch PointerEvents directly inside the iframe.
4. **Screenshot the container** (`vitestPage.getByTestId('canvas-container')`), not the canvas element — this includes the toolbar for full context.
5. **Import `page` from vitest as `vitestPage`** to avoid naming conflict with the `CanvasPage` variable.
6. **Use descriptive kebab-case names** for `toMatchScreenshot('name')` — the name becomes part of the baseline filename.
7. **Test names describe what the user sees** — "renders grouped elements with selection outline", not "tests group rendering function".

## Running Screenshot Tests

```bash
pnpm test:browser                           # run all browser tests
pnpm test:browser -- {feature}.browser      # run specific test file
```

On first run, baseline screenshots are created in `__screenshots__/`. On subsequent runs, new screenshots are compared against baselines. To update baselines after intentional visual changes:

```bash
pnpm test:browser -- --update              # update all baselines
```

## Example: Complete Test for a New Feature

If asked to "add a screenshot test for grouping", produce something like:

```typescript
import { page as vitestPage } from "vitest/browser";
import { CanvasPage } from "~/__test-utils__/browser";
import { waitForPaint } from "~/__test-utils__/browser/waiters";

describe("grouping rendering", () => {
  it("renders two grouped elements with shared selection outline", async () => {
    const page = await CanvasPage.create();

    // User draws two shapes
    await page.canvas.createElementAtCells("rectangle", [2, 2], [5, 4]);
    await page.canvas.createElementAtCells("ellipse", [6, 2], [9, 4]);

    // User selects both (click first, shift-click second)
    await page.canvas.clickCenter([2, 2], [5, 4]);
    await page.canvas.clickCenter([6, 2], [9, 4], { shiftKey: true });

    // User groups them with Ctrl+G
    await page.keyboard.withModifierKeys({ ctrlKey: true }, async () => {
      await page.keyboard.press("g");
    });
    await waitForPaint();

    await expect(vitestPage.getByTestId("canvas-container")).toMatchScreenshot(
      "grouped-elements-selected",
    );
  });
});
```

Notice how the test reads like a user story: draw two shapes, select both, group them, verify the visual result.
