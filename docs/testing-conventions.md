# Testing Conventions

## Philosophy

Two core principles:

1. **Flat tests** — each `it()` is self-contained with no shared mutable state via `beforeEach`/`afterEach` hooks (Kent C. Dodds, "Avoid Nesting When You're Testing")
2. **Disposable objects** — `using` keyword + `Symbol.dispose` guarantees cleanup even when assertions throw (Artem Zakharchenko, "`using` in tests")

## Vitest Configuration

Three config files form a workspace:

| File                       | Purpose                             | Environment           |
| -------------------------- | ----------------------------------- | --------------------- |
| `vitest.config.ts`         | Workspace root — lists projects     | N/A                   |
| `vitest.config.unit.ts`    | Unit tests (`*.unit.test.ts`)       | `node`                |
| `vitest.config.browser.ts` | Browser tests (`*.browser.test.ts`) | Playwright (chromium) |

Key settings in **unit config**: `globals: true`, `environment: 'node'`, alias `~` → `app/`.

Key settings in **browser config**: `@vitejs/plugin-vue` + `@tailwindcss/vite` plugins, `setupFiles: ['app/__test-utils__/setup-browser.ts']`, custom browser commands: `canvasDrag`, `canvasClick`, `canvasDblClick`, `showGridOverlay`.

## `withSetup` API

```ts
import { withSetup } from "~/__test-utils__/withSetup";

// Returns T & Disposable — use with `using` for automatic cleanup
using vp = withSetup(() => useViewport());
expect(vp.scrollX.value).toBe(0);
// scope.stop() called automatically at block exit, even on throw
```

**Signature**: `withSetup<T extends object>(composable: () => T): T & Disposable`

- Wraps the composable in a Vue `effectScope`
- Returns the composable result merged with `Symbol.dispose` for automatic scope cleanup
- TypeScript 5.2+ with `lib: ["ESNext"]` required for `using`/`Disposable`

## Test Factories (`app/__test-utils__/factories/`)

| Factory                              | File          | Creates                                                                                                               |
| ------------------------------------ | ------------- | --------------------------------------------------------------------------------------------------------------------- |
| `createTestElement(overrides?)`      | `element.ts`  | `ExcalidrawRectangleElement` (default), `ExcalidrawEllipseElement`, or `ExcalidrawDiamondElement` via `type` override |
| `createTestArrowElement(overrides?)` | `element.ts`  | `ExcalidrawArrowElement` with default 2-point arrow, arrowheads, and null bindings                                    |
| `createTestPoint(overrides?)`        | `point.ts`    | `Point` defaulting to `{ x: 0, y: 0 }`                                                                                |
| `createViewport(overrides?)`         | `viewport.ts` | `Viewport` defaulting to `{ scrollX: 0, scrollY: 0, zoom: 1 }`                                                        |

All factories accept a `Partial<T>` override object and spread it over sensible defaults.

## Event Handler Mock Pattern

Composable tests that use `useEventListener` from VueUse share a common mocking pattern:

```ts
type EventHandler = (...args: unknown[]) => void;
const eventHandlers = new Map<string, EventHandler[]>();

vi.mock("@vueuse/core", () => ({
  useEventListener: (_target: unknown, event: string, handler: EventHandler) => {
    const handlers = eventHandlers.get(event) ?? [];
    handlers.push(handler);
    eventHandlers.set(event, handlers);
  },
}));

function fire(type: string, overrides: Record<string, unknown> = {}) {
  const handlers = eventHandlers.get(type);
  if (!handlers?.length) throw new Error(`No handler for ${type}`);
  const e = {
    offsetX: 0,
    offsetY: 0,
    pointerId: 1,
    button: 0,
    shiftKey: false,
    preventDefault: vi.fn(),
    ...overrides,
  };
  for (const handler of handlers) handler(e);
}
```

Used in: `useLinearEditor`, `useMultiPointCreation`, `useDrawingInteraction`, `arrowTool`.

Requires `beforeEach(() => { eventHandlers.clear() })` with eslint-disable comment: `// eslint-disable-next-line vitest/no-hooks -- clearing shared event handler map between tests`.

### SSR Guard Stub

Composables that check `typeof document !== 'undefined'` need a global stub in unit tests:

```ts
vi.stubGlobal("document", {});
```

### Canvas Element Stub

Tests that need an `HTMLCanvasElement` use a minimal stub:

```ts
function createCanvasStub(): HTMLCanvasElement {
  return {
    setPointerCapture: vi.fn(),
    releasePointerCapture: vi.fn(),
  } as unknown as HTMLCanvasElement;
}
```

## When `describe` is OK

Use `describe` for **output organization only** — grouping related tests under a label. Never use it to share mutable state.

```ts
// GOOD: describe for grouping, no shared state
describe("panBy", () => {
  it("adjusts scroll by dx and dy", () => {
    using vp = withSetup(() => useViewport());
    vp.panBy(100, 50);
    expect(vp.scrollX.value).toBe(100);
  });
});
```

## When hooks are OK

| Hook                       | Unit tests (`*.unit.test.ts`)      | Browser tests (`*.browser.test.ts`) |
| -------------------------- | ---------------------------------- | ----------------------------------- |
| `beforeEach` / `afterEach` | Warn (ESLint `vitest/no-hooks`)    | Allowed                             |
| `beforeAll` / `afterAll`   | Allowed (one-time expensive setup) | Allowed                             |

When a unit test needs `beforeEach` (e.g. clearing an event handler map or resetting RAF mocks), add the eslint-disable comment with a reason:

```ts
// eslint-disable-next-line vitest/no-hooks -- clearing shared event handler map between tests
beforeEach(() => {
  eventHandlers.clear();
});
```

## Pure function tests

For stateless pure functions (no composable, no reactive state), just call the function directly — no `withSetup` or `using` needed:

```ts
it("clamps value to range", () => {
  expect(clamp(15, 0, 10)).toBe(10);
});
```

For tests that need cache/state reset (e.g. `shapeGenerator`), call the reset function inline at the start of each test:

```ts
it("generates a drawable for a rectangle", () => {
  clearShapeCache();
  const drawable = generateShape(createTestElement({ type: "rectangle" }), "light");
  expect(drawable.shape).toBe("rectangle");
});
```

Note: `generateShape` requires a `theme` parameter (`'light'` or `'dark'`).

## Browser Test Conventions

Browser tests use Vitest browser mode with Playwright. Key imports:

```ts
import { render } from "vitest-browser-vue";
import { commands } from "vitest/browser";
import { userEvent } from "vitest/browser";
```

### Rendering

Use `render()` from `vitest-browser-vue` to mount components:

```ts
const screen = render(CanvasContainer);
```

### Test Hook (`globalThis.__h`)

`CanvasContainer.vue` exposes a global `__h` object (Excalidraw's `window.h` pattern). This lets tests directly read and manipulate reactive state without DOM scraping.

**Type definition**: `app/__test-utils__/testHook.ts` defines the `TestHook` interface:

```ts
import { getH } from "~/__test-utils__/testHook";

const h = getH(); // throws if CanvasContainer not mounted
h.elements.value; // current elements array
h.selectedIds.value; // selected element IDs
h.activeTool.value; // current tool
h.scrollX.value; // viewport scroll
```

### API Class (`app/__test-utils__/browser/api.ts`)

Wraps the test hook in a clean interface for browser tests:

```ts
import { API } from "~/__test-utils__/browser";

API.elements; // readonly ExcalidrawElement[]
API.getSelectedElements(); // selected elements
API.getSelectedElement(); // exactly one selected, or throws
API.setElements(elements); // replace all elements
API.setSelectedElements(elements); // programmatic selection
API.clearSelection(); // clear selection
API.addElement({ x: 100, width: 80 }); // create + add to scene
API.getElementByID(id); // find element by id
API.activeTool; // current tool type
API.setTool("rectangle"); // switch tool
API.scrollX / API.scrollY / API.zoom; // viewport state
```

### User Interaction

- **Keyboard**: `await userEvent.keyboard('r')` (triggers key press)
- **Canvas drags**: `await commands.canvasDrag(CANVAS_SELECTOR, startX, startY, endX, endY)` (dispatches PointerEvents inside iframe — never use `page.mouse`)
- **Assertions**: `await expect.element(btn).toHaveAttribute('aria-pressed', 'true')`

### Canvas command modifier support

Current command support is intentionally narrow:

- `canvasClick` / `canvasDblClick`: `shiftKey`, `metaKey`, `altKey`
- `canvasDrag`: no modifier options (only `{ steps?: number }`)

`ctrlKey` is not currently forwarded by canvas commands. For Ctrl/Cmd+click workflows, extend command options first before relying on pointer-modifier assertions.

### Synthetic PointerEvent offsetX/offsetY Gotcha

When dispatching synthetic `PointerEvent`s via `new PointerEvent()`, the browser does **not** automatically compute `offsetX`/`offsetY` from `clientX`/`clientY`. These are read-only computed getter properties, not constructor options.

Handlers using `e.offsetX`/`e.offsetY` (like `toScene(e.offsetX, e.offsetY)`) will receive incorrect values (typically 0,0), breaking coordinate-sensitive interactions.

**Fix**: Override offset properties after construction:

```ts
const evt = new PointerEvent(type, { clientX: rect.left + x, clientY: rect.top + y, ... });
Object.defineProperty(evt, "offsetX", { value: x });
Object.defineProperty(evt, "offsetY", { value: y });
el.dispatchEvent(evt);
```

This is already applied to `canvasDrag`, `canvasClick`, and `canvasDblClick` commands. Any new canvas event commands must do the same.

### Browser Helper Classes

All browser helpers are re-exported from `~/__test-utils__/browser`:

```ts
import {
  UI,
  Pointer,
  Keyboard,
  CanvasGrid,
  API,
  checkpoint,
  waitForCanvasReady,
  waitForPaint,
} from "~/__test-utils__/browser";
```

#### Pointer (`app/__test-utils__/browser/Pointer.ts`)

```ts
const pointer = new Pointer();
await pointer.clickAt(x, y, { shiftKey: true }); // click with modifiers
await pointer.drag(sx, sy, ex, ey, { steps: 5 }); // drag
await pointer.dragBy(dx, dy); // drag relative to current position
await pointer.clickOn(element); // click element center
await pointer.select([el1, el2]); // click first, shift-click rest
await pointer.withModifiers({ shiftKey: true }, async () => {
  await pointer.clickAt(x, y); // modifier applied automatically
});
```

#### Keyboard (`app/__test-utils__/browser/Keyboard.ts`)

```ts
const keyboard = new Keyboard();
await keyboard.press("r"); // single key press
await keyboard.undo(); // Ctrl+Z
await keyboard.redo(); // Ctrl+Shift+Z
await keyboard.withModifierKeys({ ctrlKey: true }, async () => {
  await keyboard.press("g"); // Ctrl+G (group)
});
```

#### UI (`app/__test-utils__/browser/UI.ts`)

```ts
const screen = render(CanvasContainer);
const ui = new UI(screen);

await ui.clickTool("rectangle"); // keyboard shortcut
await ui.createElementRaw("rectangle", x1, y1, x2, y2); // raw pixel drag
await ui.createElementAtCells("rectangle", [2, 2], [5, 5]); // grid drag
const { id, get } = await ui.createElement("rectangle", [2, 2], [5, 5]); // returns live accessor
await ui.selectElement(element); // click on element
await ui.group(); // Ctrl+G
await ui.ungroup(); // Ctrl+Shift+G
await ui.deleteSelected(); // Delete key
await ui.expectToolActive("selection"); // assert aria-pressed
```

Tool shortcuts: `selection='1'`, `rectangle='2'`, `diamond='3'`, `ellipse='4'`, `arrow='a'`, `line='l'`, `text='t'`.

### Waiters (`app/__test-utils__/browser/waiters.ts`)

```ts
import { waitForCanvasReady, waitForPaint } from "~/__test-utils__/browser";

await waitForCanvasReady(); // polls canvas.style.width until set by bootstrapCanvas
await waitForPaint(); // waits one animation frame
```

### Custom Matchers (`app/__test-utils__/matchers/`)

```ts
import { assertSelectedElements } from "~/__test-utils__/matchers/assertSelectedElements";
import { assertElements } from "~/__test-utils__/matchers/assertElements";
import "~/__test-utils__/matchers/toCloselyEqualPoints";

// Assert selected element IDs (order-independent)
assertSelectedElements(id1, id2);

// Assert element order, properties, and selection in one call
assertElements(API.elements, [
  { id: rect.id, type: "rectangle", selected: true },
  { id: arrow.id, type: "arrow" },
]);

// Assert floating-point coordinate equality with precision
expect(points).toCloselyEqualPoints([[87.5, 87.5]], 2);
```

### Checkpoint Snapshots (`app/__test-utils__/browser/checkpoint.ts`)

Captures element count, each element, active tool, and selected IDs as named snapshots:

```ts
import { checkpoint } from "~/__test-utils__/browser";

await ui.createElementAtCells("rectangle", [1, 1], [4, 4]);
checkpoint("after rectangle"); // creates named snapshots
```

### Common Constants

```ts
const CANVAS_SELECTOR = '[data-testid="interactive-canvas"]';
```

### Screenshot Tests

Screenshot tests using `toMatchScreenshot()` require two setup steps to avoid blank white images:

#### 1. Container Sizing

`vitest-browser-vue` renders components into a bare `<div>` under `<body>` — there's no `#__nuxt` wrapper. Components using `h-full`/`w-full` (height: 100%) need every ancestor to have explicit height. Without this, `useElementSize` returns 0/0 and the renderer never paints.

The browser setup file (`app/__test-utils__/setup-browser.ts`) adds:

```ts
const style = document.createElement("style");
style.textContent = [
  "html, body { height: 100%; width: 100%; margin: 0; padding: 0; overflow: hidden; }",
  "body > div { height: 100%; width: 100%; }",
].join("\n");
document.head.append(style);
```

#### 2. Wait for Render Pipeline

The canvas rendering pipeline is async: `ResizeObserver → useElementSize ref update → watch → markAllDirty → scheduleRender → RAF → bootstrapCanvas + paint`. Poll until `bootstrapCanvas` has set `canvas.style.width`:

```ts
import { waitForCanvasReady } from "~/__test-utils__/browser";

// Checks canvas.style.width (not canvas.width, which defaults to 300)
await waitForCanvasReady();
```

#### 3. Float Snapshot Serializer

The browser setup file also registers a snapshot serializer that rounds non-integer floats to 5 decimal places, preventing flaky snapshots from IEEE 754 differences.

#### 4. Deterministic RoughJS Rendering

RoughJS uses `Math.random()` for hand-drawn stroke variations. Seed it deterministically so screenshots are pixel-identical across runs:

```ts
import { reseed, restoreSeed } from "~/__test-utils__/deterministicSeed";

describe("visual rendering", () => {
  beforeEach(() => reseed());
  afterEach(() => restoreSeed());

  it("renders a shape", async () => {
    render(CanvasContainer);
    await waitForCanvasReady();
    // ... draw shapes ...
    await expect(page.getByTestId("canvas-container")).toMatchScreenshot("shape-name");
  });
});
```

Reference screenshots are stored in `__screenshots__/` next to the test file.

### CanvasPage seeding pitfall

`CanvasPage.create()` already calls `reseed()` and registers `restoreSeed()` with `onTestFinished()`.
Do not also add `beforeEach(reseed)` / `afterEach(restoreSeed)` in the same file when using `CanvasPage`.

Double-seeding can restore `Math.random` to an already-seeded generator and leak deterministic RNG state across tests.

- Using `CanvasPage.create()`: no manual seed hooks
- Not using `CanvasPage.create()`: keep manual `reseed()` / `restoreSeed()` hooks

## Canvas Grid Testing

Use `CanvasGrid` to express canvas interactions in human-readable cell coordinates instead of raw pixels.

Default logical grid: **16 cols x 9 rows**.
Cell pixel size is resolved from the runtime canvas CSS dimensions (after `waitForCanvasReady()`), not hardcoded.

```
 0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15
┌───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐ 0
│   │   │   │   │   │   │   │   │   │   │   │   │   │   │   │   │
├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤ 1
│   │   │   │   │   │   │   │   │   │   │   │   │   │   │   │   │
...
└───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┘ 8
```

### Basic usage

```ts
import { UI } from "~/__test-utils__/browser";

const screen = render(CanvasContainer);
const ui = new UI(screen);

// Draw rectangle from cell [2,2] to cell [5,5]
await ui.createElementAtCells("rectangle", [2, 2], [5, 5]);

// Click at a specific cell
await ui.grid.click([3, 3]);

// Drag between cells
await ui.grid.drag([1, 1], [4, 4]);

// Click center of a region
await ui.grid.clickCenter([2, 2], [5, 5]);
```

### Standalone grid (without UI)

```ts
import { CanvasGrid } from "~/__test-utils__/browser";

const grid = new CanvasGrid();
await grid.drag([1, 1], [3, 3]);
await grid.click([2, 2]);
```

### Custom grid dimensions

```ts
const grid = new CanvasGrid({ cols: 10, rows: 10 });
```

### Visual debugging

Show a red semi-transparent grid overlay with cell labels for debugging:

```ts
await ui.grid.showOverlay(); // auto-removes after 5s
await ui.grid.showOverlay(10000); // custom duration (ms)
```

### Migration examples

| Before (raw pixels)                                 | After (grid cells)                                     |
| --------------------------------------------------- | ------------------------------------------------------ |
| `commands.canvasDrag(SEL, 100, 100, 300, 250)`      | `grid.drag([1, 1], [3, 3])`                            |
| `commands.canvasClick(SEL, 200, 200)`               | `grid.click([2, 2])`                                   |
| `ui.createElement('rectangle', 100, 100, 300, 250)` | `ui.createElementAtCells('rectangle', [1, 1], [3, 3])` |

### Coordinate math

`toPixels([col, row])` → `((col + 0.5) * cellWidth, (row + 0.5) * cellHeight)` — the center of the cell. Fractional cells work naturally: `[2.5, 3.5]` targets the boundary between cells.

## Page Object Pattern (Browser Tests)

For new browser tests, use `CanvasPage` instead of constructing `UI` + `render` + `waitForCanvasReady` manually. `CanvasPage.create()` handles rendering, seeding, and cleanup automatically.

```ts
import { CanvasPage } from "~/__test-utils__/browser";

describe("my feature", () => {
  it("draws a rectangle", async () => {
    const page = await CanvasPage.create();

    await page.canvas.createElementAtCells("rectangle", [2, 2], [5, 5]);

    page.scene.expectElementCount(1);
    page.scene.expectElementType(0, "rectangle");
  });
});
```

### Sub-objects

| Object           | Import        | Purpose                                                        |
| ---------------- | ------------- | -------------------------------------------------------------- |
| `page.toolbar`   | `ToolbarPO`   | Tool selection via keyboard shortcuts, aria-pressed assertions |
| `page.canvas`    | `CanvasPO`    | Drawing, clicking, and element creation on the canvas grid     |
| `page.selection` | `SelectionPO` | Click/shift-click/box-select elements, assert selection state  |
| `page.scene`     | `ScenePO`     | Programmatic element setup, flush rendering, element queries   |
| `page.keyboard`  | `Keyboard`    | Raw keyboard input, undo/redo, modifier key contexts           |

### Key methods

```ts
// ToolbarPO
await page.toolbar.select("rectangle");
await page.toolbar.expectActive("selection");

// CanvasPO — grid-based interactions
await page.canvas.draw([1, 1], [4, 4]); // raw drag
await page.canvas.click([3, 3]); // click cell
await page.canvas.clickCenter([1, 1], [4, 4]); // click region center
const ref = await page.canvas.createElement("rectangle", [2, 2], [5, 5]); // tool + drag + live accessor

// SelectionPO
await page.selection.clickElement(el);
await page.selection.shiftClickElement(el);
await page.selection.boxSelect([0, 0], [8, 4]);
page.selection.setSelected(el1, el2); // programmatic
page.selection.clear();
page.selection.expectSelected(id1, id2);
page.selection.expectNoneSelected();

// ScenePO — programmatic scene setup
const el = page.scene.addElement({ x: 50, width: 80 });
const [a, b] = page.scene.addElements({ x: 0 }, { x: 100 });
await page.scene.flush(); // markStaticDirty + waitForPaint
page.scene.expectElementCount(2);
page.scene.expectElementType(0, "rectangle");
page.scene.activeTool; // read current tool
```

### Migration from `UI`

| Before (`UI`)                                                         | After (`CanvasPage`)                                       |
| --------------------------------------------------------------------- | ---------------------------------------------------------- |
| `render(CanvasContainer)` + `waitForCanvasReady()` + `new UI(screen)` | `CanvasPage.create()`                                      |
| `ui.clickTool('rectangle')`                                           | `page.toolbar.select('rectangle')`                         |
| `ui.expectToolActive('selection')`                                    | `page.toolbar.expectActive('selection')`                   |
| `ui.createElementAtCells('rect', [2,2], [5,5])`                       | `page.canvas.createElementAtCells('rect', [2,2], [5,5])`   |
| `ui.createElement('rect', [2,2], [5,5])`                              | `page.canvas.createElement('rect', [2,2], [5,5])`          |
| `ui.grid.drag(...)`                                                   | `page.canvas.draw(...)` or `page.selection.boxSelect(...)` |
| `API.addElement(...)` + `API.h.markStaticDirty()` + `waitForPaint()`  | `page.scene.addElement(...)` + `page.scene.flush()`        |
| `assertSelectedElements(id1, id2)`                                    | `page.selection.expectSelected(id1, id2)`                  |
| `API.clearSelection()`                                                | `page.selection.clear()`                                   |

The `UI` class remains available for existing tests — no need to migrate all at once.

## ESLint Enforcement

The `app/vitest-unit-flat-tests` config warns on `beforeEach`/`afterEach` in `*.unit.test.ts` files. Browser tests are unaffected. Severity is `warn` to allow escape hatches.

### Common eslint-disable patterns in tests

| Rule                            | Reason                               | Example                                     |
| ------------------------------- | ------------------------------------ | ------------------------------------------- |
| `vitest/no-hooks`               | Shared mock state reset              | Event handler map clearing, RAF mock setup  |
| `vitest/no-conditional-in-test` | Type narrowing after `createElement` | `if (el.type !== 'arrow') throw`            |
| `vitest/expect-expect`          | Assertion in helper function         | `assertSelectedElements()` wraps `expect()` |
