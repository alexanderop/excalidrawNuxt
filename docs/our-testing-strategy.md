# Our Testing Strategy: Excalidraw's Ideas Meet a Real Browser

Excalidraw's test suite is impressive -- 94 test files, ~38k lines, rich
helper abstractions. But everything runs in jsdom: a simulated DOM with a
mocked canvas. They never see a real pixel.

We took what works from their approach and combined it with something they
can't do: **Vitest browser mode with Playwright**. Our integration tests run
in a real Chromium instance. The canvas actually renders. Pointer events hit
real elements. Screenshots capture real pixels.

This document explains the full strategy -- what we borrowed, what we changed,
and why.

---

## The Big Picture

```
+====================================================================+
|                        ExcalidrawNuxt Tests                        |
+====================================================================+
|                                                                    |
|   UNIT TESTS  (*.unit.test.ts)          BROWSER TESTS              |
|   Environment: Node                     (*.browser.test.ts)        |
|   Speed: instant                        Environment: Chromium      |
|   No DOM, no canvas                     Speed: ~1-3s per test      |
|                                         Real DOM, real canvas      |
|   +------------------------------+                                 |
|   | Pure functions               |      +------------------------+ |
|   | Composable logic             |      | Full component render  | |
|   | Math utilities               |      | Mouse drag on canvas   | |
|   | Hit testing                  |      | Keyboard shortcuts     | |
|   | Element creation             |      | Tool switching         | |
|   | Coordinate transforms        |      | Visual regression (px) | |
|   | State machines               |      | Bound text editing     | |
|   +------------------------------+      +------------------------+ |
|                                                                    |
|   ~33 files                              ~14 files (growing)       |
+====================================================================+
```

### Where we diverge from Excalidraw

```
                  Excalidraw                    Us
                  ----------                    --

Environment       jsdom (simulated)             Chromium (real browser)
Canvas            vitest-canvas-mock            Real <canvas> with real pixels
Pointer events    fireEvent() in same process   frame.evaluate() dispatches
                                                PointerEvents inside iframe
Screenshots       Not possible                  toMatchScreenshot() with
                                                deterministic RoughJS seeding
DOM queries       React Testing Library         vitest-browser-vue + Playwright
                  (getByToolName, etc.)         locators (getByRole, etc.)
State access      window.h global hook          globalThis.__h test hook + API class
Composable tests  N/A (React hooks)             withSetup() + effectScope
Framework         React                         Vue 3 + Nuxt 4
Test style        beforeEach shared state       Flat tests, `using` keyword
```

---

## The Two-Project Workspace

Three vitest config files form a workspace:

```
vitest.config.ts              <-- workspace root, lists projects
  |
  +-- vitest.config.unit.ts   <-- *.unit.test.ts, environment: node
  |
  +-- vitest.config.browser.ts <-- *.browser.test.ts, Playwright chromium
```

```
pnpm test              # Runs both projects (--bail=1)
pnpm test:unit         # Unit tests only
pnpm test:browser      # Browser tests only
```

### Unit config

```typescript
// vitest.config.unit.ts
export default defineConfig({
  test: {
    name: "unit",
    include: ["app/**/*.unit.test.ts"],
    environment: "node", // no DOM, no browser
    globals: true,
  },
});
```

### Browser config

```typescript
// vitest.config.browser.ts
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  test: {
    name: "browser",
    include: ["app/**/*.browser.test.ts"],
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: "chromium" }],
      commands: { canvasDrag, canvasClick, canvasDblClick, showGridOverlay },
    },
    setupFiles: ["app/__test-utils__/setup-browser.ts"],
  },
});
```

The `commands` field registers custom browser commands that dispatch
PointerEvents directly inside the iframe. This is the critical difference
from Excalidraw: we cannot use `page.mouse` because Vitest browser mode
runs components inside an iframe and coordinate translation breaks.

---

## The Test Pyramid: Our Shape

```
          /\
         /  \      <-- Screenshot tests (visual regression)
        /    \         Real pixels, deterministic seeds
       /------\
      /        \   <-- Browser integration tests
     /          \      Real DOM, real canvas, real events
    /------------\
   /              \
  / Unit tests     \ <-- Composable logic, math, factories
 /  (flat, instant) \    Node environment, no DOM
/____________________\
```

Unlike Excalidraw's inverted pyramid (mostly integration), we aim for a
**balanced pyramid**:

- **Unit tests** are the foundation. Fast, no browser overhead. Test
  composable logic, math, element creation, hit detection, state machines.
- **Browser tests** cover what units can't: actual drawing, tool switching,
  keyboard shortcuts, selection interactions, text editing.
- **Screenshot tests** sit at the top. Deterministic RoughJS seeding +
  `toMatchScreenshot()` catches visual regressions that no assertion can.

---

## The Helper Architecture

We mirror Excalidraw's layered approach but adapted for Vue and real browsers:

```
+==================================================================+
|                                                                  |
|  Layer 5:  Test files                                            |
|            td.createElement('rectangle', [2,2], [5,5])           |
|            td.expectSelected(rect.id)                            |
|            td.checkpoint('after draw')                            |
|                                                                  |
+==================================================================+
|                                                                  |
|  Layer 4:  TestDrawVue (unified facade)                          |
|            Flat API combining all layers below                   |
|            td.createElement / td.addElement / td.boxSelect       |
|            td.expectElementCount / td.expectSelected             |
|            td.undo / td.group / td.flush                         |
|            Inspired by tldraw's TestEditor pattern               |
|                                                                  |
+==================================================================+
|                                                                  |
|  Layer 3:  CanvasPage + Page Objects + Matchers (legacy)         |
|            CanvasPage.create() -> page.canvas / page.selection   |
|            UI.clickTool() / UI.createElement()                   |
|            CanvasGrid -- logical cells -> pixel coordinates      |
|            assertElements / assertSelectedElements               |
|            toCloselyEqualPoints / checkpoint                     |
|                                                                  |
+==================================================================+
|                                                                  |
|  Layer 2:  API + TestHook (globalThis.__h)                       |
|            API.elements / API.addElement / API.clearSelection    |
|            API.getSelectedElement / API.activeTool / API.setTool |
|            getH() -- test hook accessor                          |
|                                                                  |
+==================================================================+
|                                                                  |
|  Layer 1:  Pointer + Keyboard                                    |
|            Pointer.drag() -- delegates to canvasDrag command     |
|            Pointer.clickAt() -- with modifier key support        |
|            Pointer.clickOn(element) / Pointer.select(elements)   |
|            Pointer.withModifiers() -- scoped modifier context    |
|            Keyboard.press() -- delegates to userEvent.keyboard   |
|            Keyboard.withModifierKeys() -- scoped modifier context|
|            Keyboard.undo() / Keyboard.redo()                     |
|                                                                  |
+==================================================================+
|                                                                  |
|  Layer 0:  Custom browser commands                               |
|            canvasDrag -- frame.evaluate() dispatches PointerEvent|
|            canvasClick -- pointerdown + pointerup in iframe      |
|            canvasDblClick -- double-click in iframe              |
|            showGridOverlay -- debug overlay for visual debugging  |
|                                                                  |
+==================================================================+
```

Compare this to tldraw's and Excalidraw's stacks:

```
tldraw                          Excalidraw                  Us
------                          ----------                  --
Layer 3: Test files             Layer 4: Test files         Layer 5: Test files
Layer 2: TestEditor (unified)   Layer 3: UI (React)         Layer 4: TestDrawVue (unified facade)
Layer 1: Editor API (sync)      Layer 2: Pointer/Keyboard   Layer 3: CanvasPage + POs (legacy)
Layer 0: jsdom                  Layer 1: API + window.h     Layer 2: API + TestHook
                                Layer 0: @testing-library   Layer 1: Pointer + Keyboard (async)
                                                            Layer 0: Browser commands (iframe)
```

Key differences:

- **TestDrawVue** is a thin facade (like tldraw's TestEditor) that flattens
  all layers into a single class — one import, one variable, flat autocomplete
- Our helpers are **async** (real browser events are async)
- We have `globalThis.__h` (analogous to Excalidraw's `window.h`) for direct
  reactive state access via the `API` class
- We have `CanvasGrid` which neither tldraw nor Excalidraw has -- logical cell
  coordinates instead of raw pixels

---

## Layer 0: Browser Commands

The foundation. Canvas events must be dispatched **inside the iframe** where
the component lives. Vitest browser mode runs your test code in Node, but the
component renders in a Chromium iframe. Using `page.mouse` would compute
coordinates relative to the page viewport, not the iframe -- causing silent
misses.

Our solution: custom commands that call `frame.evaluate()`:

```typescript
// canvasDrag.ts
export const canvasDrag: BrowserCommand<[...]> = async (
  ctx, selector, startX, startY, endX, endY, options
) => {
  const frame = await ctx.frame()
  const steps = options?.steps ?? 5

  await frame.evaluate(({ sel, sx, sy, ex, ey, s }) => {
    const el = document.querySelector(sel)
    const rect = el.getBoundingClientRect()

    function fire(type, x, y) {
      const evt = new PointerEvent(type, {
        clientX: rect.left + x,
        clientY: rect.top + y,
        button: 0,
        buttons: type === 'pointerup' ? 0 : 1,
        bubbles: true,
        pointerId: 1,
        pointerType: 'mouse',
        isPrimary: true,
      })
      // Synthetic PointerEvents don't reliably compute offsetX/offsetY.
      Object.defineProperty(evt, 'offsetX', { value: x })
      Object.defineProperty(evt, 'offsetY', { value: y })
      el.dispatchEvent(evt)
    }

    fire('pointerdown', sx, sy)
    for (let i = 1; i <= s; i++) {
      const t = i / s
      fire('pointermove', sx + (ex - sx) * t, sy + (ey - sy) * t)
    }
    fire('pointerup', ex, ey)
  }, { sel, sx, sy, ex, ey, s: steps })
}
```

**Why not Excalidraw's approach?** They call `fireEvent.pointerDown(canvas)`
synchronously in the same process. We can't -- our tests run in Node, the
canvas is in Chromium. `frame.evaluate()` bridges the gap.

---

## Layer 1: Pointer and Keyboard

Wrappers over browser commands with modifier key support:

```typescript
// Pointer.ts
export class Pointer {
  private x = 0
  private y = 0
  private modifiers: ModifierKeys = {}

  /** Scoped modifier context (Excalidraw pattern) */
  async withModifiers(mods: ModifierKeys, fn: () => Promise<void>): Promise<void> {
    const prev = { ...this.modifiers }
    this.modifiers = { ...this.modifiers, ...mods }
    await fn()
    this.modifiers = prev
  }

  async clickAt(x, y, opts?: ModifierKeys) {
    this.x = x; this.y = y
    await commands.canvasClick(CANVAS_SELECTOR, x, y, { ...this.modifiers, ...opts })
  }

  async drag(sx, sy, ex, ey, options?) { ... }
  async dragBy(dx, dy, options?) { ... }

  /** Click on an element's center */
  async clickOn(element: ExcalidrawElement, opts?: ModifierKeys) { ... }

  /** Shift-click multiple elements to select them */
  async select(elements: ExcalidrawElement | ExcalidrawElement[]) { ... }
}

// Keyboard.ts
export class Keyboard {
  async press(key) { await userEvent.keyboard(key) }

  /** Modifier key context (Excalidraw pattern) */
  async withModifierKeys(mods: ModifierKeys, fn: () => Promise<void>) { ... }
  async undo() { await userEvent.keyboard('{Control>}z{/Control}') }
  async redo() { await userEvent.keyboard('{Control>}{Shift>}z{/Shift}{/Control}') }
}
```

**vs Excalidraw's Pointer**: Their `Pointer` is synchronous. Ours is async
(real browser events). Both now support scoped modifier key contexts -- ours
via `Pointer.withModifiers()` and `Keyboard.withModifierKeys()`, plus
per-call modifier options as an alternative.

---

## Layer 2: UI and CanvasGrid

### The UI class

Composes Pointer + Keyboard + Grid + API into intent-level operations:

```typescript
export class UI {
  readonly pointer = new Pointer()
  readonly keyboard = new Keyboard()
  readonly grid = new CanvasGrid()

  async clickTool(name) {
    const shortcut = TOOL_SHORTCUTS[name]  // rectangle -> '2', arrow -> 'a'
    await this.keyboard.press(shortcut)
  }

  async createElementRaw(tool, x1, y1, x2, y2) {
    await this.clickTool(tool)
    await this.pointer.drag(x1, y1, x2, y2)
  }

  async createElementAtCells(tool, start, end) {
    await this.clickTool(tool)
    await this.grid.drag(start, end)
  }

  /** Draw an element and return a live accessor to it */
  async createElement(tool, start: Cell, end: Cell) {
    const beforeCount = API.elements.length
    await this.createElementAtCells(tool, start, end)
    await waitForPaint()
    const el = API.elements.at(-1)
    if (!el || API.elements.length <= beforeCount) {
      throw new Error(`createElement(${tool}) did not produce an element`)
    }
    return { id: el.id, get: () => API.getElementByID(el.id) ?? el }
  }

  async selectElement(element) { await this.pointer.clickOn(element) }
  async group() { ... }      // Ctrl+G
  async ungroup() { ... }    // Ctrl+Shift+G
  async deleteSelected() { await this.keyboard.press('{Delete}') }
  async expectToolActive(name) { ... } // checks aria-pressed on toolbar button
}
```

### The CanvasGrid (our invention)

Excalidraw tests use raw pixel coordinates everywhere: `mouse.down(30, 20)`.
This is fragile and hard to read. Our `CanvasGrid` maps a logical grid onto
the canvas:

```
 0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15
+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+ 0
|   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+ 1
|   |   | A===========================B |   |   |   |   |   |   |
+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+ 2
|   |   | |                           | |   |   |   |   |   |   |
+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+ 3
|   |   | |         rectangle         | |   |   |   |   |   |   |
+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+ 4
|   |   | |                           | |   |   |   |   |   |   |
+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+ 5
|   |   | C===========================D |   |   |   |   |   |   |
+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+ 6

  ui.createElementAtCells('rectangle', [2, 1], [9, 6])
  grid.clickCenter([2, 1], [9, 6])   // clicks the center
```

Default: **16 cols x 9 rows** = 80px cells on a 1280x720 canvas.

The grid auto-detects canvas dimensions from the DOM. `toPixels([col, row])`
returns the **center** of the cell: `((col + 0.5) * cellWidth, (row + 0.5) * cellHeight)`.

**Why this matters**: Reading `grid.drag([2, 1], [9, 6])` tells you exactly
where on the canvas the interaction happens. Reading `canvasDrag(SEL, 200, 80, 720, 480)`
tells you nothing without a calculator.

Debug overlay:

```typescript
await ui.grid.showOverlay(); // shows red semi-transparent grid for 5s
```

---

## Unit Tests: The Foundation

Unit tests run in Node with no DOM. They test pure logic:

### Flat tests with `using` and `withSetup`

```typescript
// useViewport.unit.test.ts
it("adjusts scroll by dx and dy", () => {
  using vp = withSetup(() => useViewport());
  vp.panBy(100, 50);
  expect(vp.scrollX.value).toBe(100);
  // scope.stop() called automatically via Symbol.dispose
});
```

**vs Excalidraw**: They use `beforeEach` + mutable state everywhere. We prefer
**flat tests** -- each `it()` is self-contained. The `using` keyword +
`Symbol.dispose` guarantees cleanup even if an assertion throws. No
`afterEach` needed.

### Test factories

```typescript
// factories/element.ts
const el = createTestElement({ type: "rectangle", x: 42, width: 200 });
const arrow = createTestArrowElement({ endArrowhead: "arrow" });
```

**vs Excalidraw's `API.createElement`**: Same idea -- factory with smart
defaults. Theirs is 400+ lines handling every element type through a React
render. Ours is ~67 lines of plain object spreads. Simpler because we
separate "create an element object" (unit) from "draw an element on canvas"
(browser).

### Event handler mock pattern

For composables that use `useEventListener`:

```typescript
const eventHandlers = new Map<string, EventHandler[]>();

vi.mock("@vueuse/core", () => ({
  useEventListener: (_target, event, handler) => {
    const handlers = eventHandlers.get(event) ?? [];
    handlers.push(handler);
    eventHandlers.set(event, handlers);
  },
}));

function fire(type, overrides = {}) {
  const handlers = eventHandlers.get(type);
  const e = { offsetX: 0, offsetY: 0, pointerId: 1, ...overrides };
  for (const handler of handlers) handler(e);
}
```

This lets unit tests simulate pointer events without a DOM, without a browser,
without even a canvas element. Just call `fire('pointerdown', { offsetX: 100 })`
and the composable's handler runs.

---

## Browser Tests: The Confidence Layer

Browser tests render real Vue components in real Chromium.

### TestDrawVue — the preferred approach

`TestDrawVue` is a unified facade (inspired by tldraw's `TestEditor`) that
flattens all browser helpers into a single flat API. One import, one variable:

```typescript
import { TestDrawVue } from "~/__test-utils__/browser";

it("creates a rectangle on drag", async () => {
  const td = await TestDrawVue.create();

  await td.createElementAtCells("rectangle", [2, 2], [5, 5]);

  td.expectElementCount(1);
  td.expectElementType(0, "rectangle");
  expect(td.elements[0]!.width).toBeGreaterThan(0);
  td.expectToolToBe("selection");
});
```

No more `page.canvas.`, `page.selection.`, `page.scene.` — just `td.`.

### Selection with TestDrawVue

```typescript
it("box-selects multiple elements", async () => {
  const td = await TestDrawVue.create();

  const r1 = await td.createElement("rectangle", [1, 1], [3, 3]);
  const r2 = await td.createElement("ellipse", [5, 1], [7, 3]);
  td.clearSelection();
  await td.flush();

  await td.boxSelect([0, 0], [8, 4]);
  await td.flush();

  td.expectSelected(r1.id, r2.id);
});
```

### Programmatic setup + interaction

```typescript
it("programmatic setSelected works", async () => {
  const td = await TestDrawVue.create();

  const r1 = td.addElement({ x: 50, y: 50, width: 60, height: 60 });
  const r2 = td.addElement({ x: 200, y: 50, width: 60, height: 60 });
  await td.flush();

  td.select(r1, r2);
  td.expectSelected(r1.id, r2.id);
});
```

### Undo/redo

```typescript
it("undo restores deleted element", async () => {
  const td = await TestDrawVue.create();

  await td.createElementAtCells("rectangle", [2, 2], [5, 5]);
  td.expectElementCount(1);

  await td.deleteSelected();
  td.expectElementCount(0);

  await td.undo();
  td.expectElementCount(1);
});
```

### Raw helpers for edge cases

`td.pointer`, `td.keyboard`, `td.grid`, and `td.screen` are still accessible
for scenarios that need the underlying helpers directly.

**vs Excalidraw**: They check `h.state.activeTool.type`. We check
`td.activeTool` (which reads from our `globalThis.__h` test hook).
Both provide direct state access — we can also use `td.expectToolActive()`
for DOM-level aria-pressed assertions.

### Screenshot tests (visual regression)

```typescript
describe("visual rendering", () => {
  beforeEach(() => reseed()); // deterministic Math.random
  afterEach(() => restoreSeed());

  it("renders shapes correctly", async () => {
    render(DrawVueTestHarness);
    await waitForCanvasReady();
    // ... draw shapes ...
    await expect(page.getByTestId("canvas-container")).toMatchScreenshot("shapes");
  });
});
```

**This is what Excalidraw cannot do.** Their `vitest-canvas-mock` provides a
no-op 2D context. They can never verify that a rectangle actually looks like
a rectangle. We can.

---

## Async Rendering: The `waitFor` Pattern

The canvas rendering pipeline is async:

```
ResizeObserver fires
      |
      v
useElementSize ref updates
      |
      v
watch() triggers markAllDirty()
      |
      v
scheduleRender() queues RAF
      |
      v
requestAnimationFrame callback
      |
      v
bootstrapCanvas() + paint()
```

Tests must wait for this pipeline. Both waiters live in
`app/__test-utils__/browser/waiters.ts`:

```typescript
// Wait for canvas to be ready (bootstrapCanvas sets style.width)
// Note: checks style.width, NOT canvas.width (which defaults to 300)
export async function waitForCanvasReady() {
  await expect
    .poll(
      () => {
        const canvas = document.querySelector<HTMLCanvasElement>(CANVAS_SELECTOR);
        return canvas?.style.width ?? "";
      },
      { timeout: 5000 },
    )
    .not.toBe("");
  await new Promise<void>((r) => requestAnimationFrame(() => r()));
}

// Wait one frame for paint to complete
export async function waitForPaint() {
  await new Promise<void>((r) => requestAnimationFrame(() => r()));
}
```

**vs Excalidraw**: They also wait -- their `render()` uses `waitFor()` to
check for canvas presence and `isLoading === false`. Same idea, different
signals.

---

## Deterministic Seeding

RoughJS uses `Math.random()` for hand-drawn stroke jitter. Without
deterministic seeding, screenshot tests would produce different images on
every run.

```typescript
// deterministicSeed.ts
function mulberry32(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function reseed(seed = 12_345) {
  originalRandom = Math.random;
  Math.random = mulberry32(seed);
  excalidrawReseed(seed); // also seed @excalidraw/common's randomInteger
}
```

**vs Excalidraw**: They use `reseed(7)` for deterministic element IDs in
snapshot tests. We use it for that AND for deterministic pixels in screenshot
tests. Same mechanism, higher stakes.

---

## The Setup File

```typescript
// setup-browser.ts
import { expect } from "vitest";
import "~/assets/css/main.css";

// vitest-browser-vue mounts into <div> under <body>.
// Ensure full height chain for useElementSize to work.
const style = document.createElement("style");
style.textContent = [
  "html, body { height: 100%; width: 100%; margin: 0; padding: 0; overflow: hidden; }",
  "body > div { height: 100%; width: 100%; }",
].join("\n");
document.head.append(style);

// Float snapshot serializer — prevents float precision flakiness in snapshots.
expect.addSnapshotSerializer({
  serialize(val: number) {
    return val.toFixed(5);
  },
  test(val: unknown) {
    return typeof val === "number" && Number.isFinite(val) && !Number.isInteger(val);
  },
});
```

**vs Excalidraw's `setupTests.ts`**: Theirs is 120 lines of mocks for
everything jsdom is missing (canvas, fonts, clipboard, IndexedDB, pointer
capture, matchMedia...). Ours is ~25 lines. Real browsers don't need mocks.

---

## File Organization

```
app/
  __test-utils__/
    browser/
      TestDrawVue.ts      <-- Unified facade (preferred for new tests)
      Pointer.ts          <-- Pointer class (drag, clickAt, clickOn, select, withModifiers)
      Keyboard.ts         <-- Keyboard class (press, withModifierKeys, undo, redo)
      UI.ts               <-- High-level: clickTool, createElement, group, ungroup (legacy)
      CanvasGrid.ts       <-- Logical grid -> pixel mapping
      api.ts              <-- API class wrapping globalThis.__h test hook
      checkpoint.ts       <-- Checkpoint snapshot pattern
      waiters.ts          <-- waitForCanvasReady, waitForPaint
      pageObjects/        <-- CanvasPage, ToolbarPO, CanvasPO, etc. (legacy)
      index.ts            <-- Re-exports all browser helpers
    commands/
      canvasDrag.ts       <-- Browser command: drag on canvas
      canvasClick.ts      <-- Browser command: click on canvas
      canvasDblClick.ts   <-- Browser command: double-click
      showGridOverlay.ts  <-- Debug: red grid overlay
    factories/
      element.ts          <-- createTestElement, createTestArrowElement
      point.ts            <-- createTestPoint
      viewport.ts         <-- createViewport
    matchers/
      assertElements.ts         <-- Order + property + selection assertion
      assertSelectedElements.ts <-- Selected element ID assertion
      toCloselyEqualPoints.ts   <-- Geometry precision matcher
    mocks/
      eventListenerMock.ts  <-- useEventListener mock for unit tests
      canvasStub.ts         <-- Minimal canvas stub for unit tests
      canvasContextMock.ts  <-- 2D context mock for unit tests
    serializers/
      floatSerializer.ts    <-- roundFloats() for snapshot precision
      elementSerializer.ts  <-- Element snapshot formatting
    withSetup.ts            <-- effectScope wrapper with Symbol.dispose
    deterministicSeed.ts    <-- Mulberry32 PRNG for reproducible renders
    testHook.ts             <-- TestHook interface + getH() accessor
    setup-browser.ts        <-- Browser setup: CSS height chain + float serializer
  features/
    tools/
      useTool.unit.test.ts                <-- unit
      arrowTool.unit.test.ts              <-- unit
      drawing.browser.test.ts             <-- browser (promoted from unit)
      userWorkflows.browser.test.ts       <-- browser
      boundText.browser.test.ts           <-- browser
      textTool.browser.test.ts            <-- browser
      DrawingToolbar.browser.test.ts      <-- browser
      arrowToolReset.browser.test.ts      <-- browser
    canvas/
      coords.unit.test.ts                <-- unit
      DrawVue.browser.test.ts              <-- browser
    rendering/
      renderElement.unit.test.ts          <-- unit
      rendering.browser.test.ts           <-- browser (screenshots)
    selection/
      hitTest.unit.test.ts                <-- unit
      bounds.unit.test.ts                 <-- unit
      selection.browser.test.ts           <-- browser (promoted from unit)
    linear-editor/
      linearEditor.browser.test.ts        <-- browser
      multiPoint.browser.test.ts          <-- browser
    theme/
      theme.browser.test.ts               <-- browser (screenshots)
    code/
      code.browser.test.ts                <-- browser
    elements/
      createElement.unit.test.ts          <-- unit
      mutateElement.unit.test.ts          <-- unit
    ...
```

**Convention**: Tests live next to the code they test. File suffix determines
the project: `.unit.test.ts` or `.browser.test.ts`.

---

## When to Write Which Test

```
+-------------------------------------------------------------------+
|                                                                   |
|  UNIT TEST when:                 BROWSER TEST when:               |
|                                                                   |
|  - Pure function (no DOM)        - User interaction on canvas     |
|  - Composable logic              - Tool switching + drawing       |
|  - Math / geometry               - Keyboard shortcuts             |
|  - Element creation              - Selection via click/drag       |
|  - Hit testing calculations      - Text editing (WYSIWYG)         |
|  - State machine transitions     - Visual regression (screenshot) |
|  - Coordinate transforms         - Cross-feature workflows        |
|  - Anything testable without     - Anything requiring a real      |
|    a real DOM or canvas            <canvas> or real events        |
|                                                                   |
+-------------------------------------------------------------------+
```

Rules of thumb:

1. **Start with a unit test.** If the logic can be tested without rendering
   a component, keep it in Node. Faster, simpler, more isolated.
2. **Promote to browser when you need the DOM.** If the test needs to click
   a canvas, see a toolbar, or verify visual output, it's a browser test.
3. **Add a screenshot test for visual regression.** If a change could break
   how something looks (not just how it behaves), add a screenshot assertion.

---

## What We Took From Excalidraw

| Pattern                | Their Version                            | Our Version                                               |
| ---------------------- | ---------------------------------------- | --------------------------------------------------------- |
| Test hook (`window.h`) | Global `h` on `window`                   | `globalThis.__h` + `API` class                            |
| Pointer class          | Sync, tracks position, fires `fireEvent` | Async, tracks position, delegates to `canvasDrag` command |
| Keyboard helper        | `withModifierKeys()` scoped context      | `withModifierKeys()` + per-call options                   |
| UI high-level helper   | `UI.createElement()` returns Proxy       | `UI.createElement()` returns `{ id, get }` accessor       |
| Element factory        | `API.createElement()` 400-line factory   | `createTestElement()` 67-line spread                      |
| Deterministic seeds    | `reseed(7)` for IDs                      | `reseed(12345)` for IDs + pixels                          |
| Float serializer       | Snapshot serializer (5 decimals)         | Snapshot serializer in setup-browser.ts (5 decimals)      |
| `assertElements`       | Order + property + selection check       | Same pattern in `matchers/assertElements.ts`              |
| `toCloselyEqualPoints` | Custom matcher for geometry              | Same pattern in `matchers/toCloselyEqualPoints.ts`        |
| Checkpoint snapshots   | `checkpoint()` for named state dumps     | `checkpoint()` in `browser/checkpoint.ts`                 |
| Custom queries         | `getByToolName` via `buildQueries`       | `getByRole` with aria attributes                          |
| `waitFor` init         | `waitFor(() => canvas && !isLoading)`    | `waitForCanvasReady()` polling `style.width`              |
| Canvas element ref     | `GlobalTestState.interactiveCanvas`      | `CANVAS_SELECTOR` constant                                |

## What We Took From tldraw

| Pattern                  | tldraw's Version                                                             | Our Version                                                                      |
| ------------------------ | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Unified TestEditor class | `TestEditor` (850+ lines): pointer, keyboard, state, assertions in one class | `TestDrawVue`: flat facade wrapping Pointer, Keyboard, Grid, API                 |
| Built-in assertions      | `editor.expectToBeIn('select.idle')`, `editor.expectShapeToMatch(...)`       | `td.expectToolToBe(...)`, `td.expectElementCount(...)`, `td.expectSelected(...)` |
| `getLastCreatedShape()`  | Returns last shape by creation order                                         | `td.getLastElement<T>()` returns last element in scene                           |
| Fast E2E reset           | `hardResetEditor()` reuses page, resets state                                | `TestDrawVue.create()` resets via `API` if `__h` already exists                  |

## What We Added

| Pattern                                 | Why                                                           |
| --------------------------------------- | ------------------------------------------------------------- |
| **CanvasGrid**                          | Human-readable cell coordinates instead of raw pixels         |
| **`withSetup` + `using`**               | Automatic effectScope cleanup without `afterEach`             |
| **Screenshot tests**                    | Visual regression that Excalidraw can't do with mocked canvas |
| **`canvasDrag`/`canvasClick` commands** | Bridge iframe coordinate gap in Vitest browser mode           |
| **Flat test philosophy**                | Each `it()` self-contained, no shared mutable state           |
| **`showGridOverlay` debug command**     | Visual debugging for canvas test coordinates                  |
| **Separate unit/browser configs**       | Unit tests stay fast in Node; browser tests only when needed  |
| **TestDrawVue unified facade**          | tldraw-inspired single class replacing scattered page objects |

## What We Intentionally Don't Have

| Excalidraw Pattern               | Why We Skip It                                                                                  |
| -------------------------------- | ----------------------------------------------------------------------------------------------- |
| Element Proxy pattern            | Vue reactivity handles staleness. No immutable-update problem. We return `{ id, get }` instead. |
| jsdom canvas mock                | We have a real canvas. No mock needed.                                                          |
| Clipboard/DataTransfer polyfills | Real browser has these natively.                                                                |
| `act()` wrappers everywhere      | No React batching model. Vue's reactivity is synchronous.                                       |
| Font/matchMedia/IndexedDB mocks  | Real browser provides all of these.                                                             |

---

## Gaps to Fill (Future Work)

```
+-------------------------------------------------------------------+
|  DONE                                                              |
+-------------------------------------------------------------------+
|  [x] assertElements() helper       -> matchers/assertElements.ts   |
|  [x] assertSelectedElements()      -> matchers/assertSelectedElements.ts |
|  [x] toCloselyEqualPoints()        -> matchers/toCloselyEqualPoints.ts |
|  [x] Float snapshot serializer     -> setup-browser.ts             |
|  [x] Keyboard.withModifierKeys()   -> browser/Keyboard.ts          |
|  [x] Pointer.withModifiers()       -> browser/Pointer.ts           |
|  [x] Pointer.clickOn / select      -> browser/Pointer.ts           |
|  [x] Keyboard.undo / redo          -> browser/Keyboard.ts          |
|  [x] Checkpoint snapshots          -> browser/checkpoint.ts        |
|  [x] API class (window.h equiv)    -> browser/api.ts + testHook.ts |
|  [x] UI.createElement (accessor)   -> browser/UI.ts                |
|  [x] UI.group / ungroup / delete   -> browser/UI.ts                |
|  [x] TestDrawVue unified facade    -> browser/TestDrawVue.ts       |
|      (tldraw TestEditor inspired)     Flat API, built-in assertions|
+-------------------------------------------------------------------+
|  TODO                           Priority   Inspiration             |
+-------------------------------------------------------------------+
|  Migrate remaining tests to      Medium    tldraw unified pattern  |
|  TestDrawVue (from CanvasPage)                                     |
|                                                                    |
|  toCloselyMatchObject matcher    Low       tldraw float tolerance  |
|  for partial object matching                on nested objects      |
|                                                                    |
|  Fluent scene builder API        Low       tldraw JSX shape        |
|  td.scene().addRect().addArrow()           creation syntax         |
|                                                                    |
|  State machine transition tests  Low       tldraw expectToBeIn()   |
|  td.expectToolState('select.idle')                                 |
|                                                                    |
|  Multi-touch Pointer             Low       Excalidraw finger1,     |
|  instances for pinch/zoom                  finger2 Pointers        |
|                                                                    |
|  Render count verification       Low       Excalidraw spy on       |
|  (spy on markStaticDirty)                  renderStaticScene       |
+-------------------------------------------------------------------+
```

---

## Summary

Our testing strategy in one sentence: **Unit-test composable logic in Node
for speed, browser-test canvas interactions in real Chromium for confidence,
and screenshot-test visual output for pixel-level regression safety.**

```
  User intent:    "draw a rectangle at cells [2,2] to [5,5]"
                          |
                          v
  Test code:      const td = await TestDrawVue.create()
                  await td.createElementAtCells('rectangle', [2,2], [5,5])
                  td.expectElementCount(1)
                  td.expectToolToBe('selection')
                          |
                          v
  TestDrawVue:    await td.selectTool('rectangle')  // keyboard shortcut
                  await td.grid.drag([2,2], [5,5])  // grid drag
                          |
                          v
  CanvasGrid:     toPixels([2,2]) -> { x: 200, y: 200 }
                  toPixels([5,5]) -> { x: 440, y: 440 }
                          |
                          v
  canvasDrag:     frame.evaluate(() => {
                    el.dispatchEvent(new PointerEvent('pointerdown', ...))
                    el.dispatchEvent(new PointerEvent('pointermove', ...))
                    el.dispatchEvent(new PointerEvent('pointerup', ...))
                  })
                          |
                          v
  Real Chromium:  Vue component handles events -> reactive state updates
                  -> canvas re-renders -> real pixels on screen
                          |
                          v
  Assertions:     td.expectElementCount(1)       // via API.elements
                  td.expectToolToBe('selection')  // via API.activeTool
                  await td.expectToolActive('selection')  // via aria-pressed
```

We get the best of three worlds: Excalidraw's thoughtful helper abstractions,
tldraw's unified TestEditor pattern, AND the confidence of real browser rendering.
