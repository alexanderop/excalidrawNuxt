# How Excalidraw Tests a Drawing App Without Ever Opening a Browser

Excalidraw is a collaborative whiteboard app built with React. Its test suite
covers 94 test files and ~38,000 lines of test code across a monorepo of five
packages. The remarkable thing? Every single test runs in jsdom -- a simulated
DOM in Node.js. No Playwright. No Cypress. No real browser at all.

This document breaks down exactly how they pull it off, what abstractions they
built, and where the tradeoffs lie.

---

## The Big Picture

```
+------------------------------------------------------------------+
|                     Excalidraw Monorepo                           |
|                                                                   |
|  +------------------+  +-------------------+  +----------------+  |
|  | packages/math    |  | packages/element  |  | packages/common|  |
|  | 7 test files     |  | 23 test files     |  | 5 test files   |  |
|  | Pure unit tests  |  | Mixed unit/integ  |  | Pure unit tests|  |
|  +------------------+  +-------------------+  +----------------+  |
|                                                                   |
|  +--------------------------------------------------+             |
|  | packages/excalidraw          52 test files        |             |
|  |                                                   |             |
|  |  Full-app integration tests (render <Excalidraw>) |             |
|  |  Simulate mouse, keyboard, tool switching         |             |
|  |  Assert on elements, state, history, snapshots    |             |
|  +--------------------------------------------------+             |
|                                                                   |
|  +------------------+                                             |
|  | packages/utils   |                                             |
|  | 4 test files     |                                             |
|  | Geometry/export  |                                             |
|  +------------------+                                             |
+------------------------------------------------------------------+
```

Their test pyramid is intentionally **inverted**. Most tests are integration
tests that render the entire app and simulate real user actions. Pure unit
tests are reserved for math and utility logic.

```
        /\
       /  \       <-- Few pure unit tests (math, utils)
      /    \
     /------\
    /        \    <-- Some element-level tests
   /----------\
  /            \
 /  Integration \  <-- Bulk of the tests: full-app render
/________________\     with simulated pointer + keyboard
```

Why? Because most bugs in a drawing app live at the **intersection of
interactions** -- clicking a tool, dragging on the canvas, pressing a modifier
key, and verifying the resulting element. Unit-testing those in isolation
would miss the actual failure modes.

---

## Test Infrastructure at a Glance

```
+------------------------------------------------------------------+
|                        vitest.config.mts                          |
|  - environment: jsdom                                             |
|  - globals: true (no import describe/it/expect)                   |
|  - hooks: parallel                                                |
|  - coverage: 60% lines, 70% branches, 63% functions              |
|  - path aliases: @excalidraw/* -> packages/*/src                  |
+------------------------------------------------------------------+
          |
          v
+------------------------------------------------------------------+
|                         setupTests.ts                             |
|                                                                   |
|  vitest-canvas-mock        <-- Mock <canvas> 2D context           |
|  @testing-library/jest-dom <-- DOM matchers                       |
|  fake-indexeddb/auto       <-- Mock IndexedDB                     |
|  setPointerCapture mock    <-- jsdom doesn't support it           |
|  matchMedia mock           <-- No media queries in jsdom          |
|  FontFace + fonts mock     <-- No real font loading               |
|  ClipboardEvent polyfill   <-- jsdom doesn't have it              |
|  DataTransfer polyfill     <-- jsdom doesn't have it              |
|  Font fetch -> filesystem  <-- Read font files from disk          |
|  div#root appended to body <-- React render target                |
|  console.error override    <-- Better act() warning messages      |
+------------------------------------------------------------------+
```

The `setupTests.ts` file is a masterclass in working around jsdom's
limitations. Each mock exists because jsdom is missing a browser API that
Excalidraw relies on at runtime.

---

## The Helper Architecture

The real power of Excalidraw's tests comes from a layered helper system.
Each layer builds on the previous one to provide higher-level abstractions.

```
+------------------------------------------------------------------+
|                                                                   |
|  Layer 4:  Test files                                             |
|            Use UI.createElement(), mouse.click(), Keyboard.undo() |
|                                                                   |
+------------------------------------------------------------------+
|                                                                   |
|  Layer 3:  UI helper                                              |
|            UI.createElement() -- draws an element via mouse sim   |
|            UI.resize() / UI.rotate() / UI.editText()              |
|            UI.group() / UI.ungroup()                              |
|            Returns Proxy objects for live element access           |
|                                                                   |
+------------------------------------------------------------------+
|                                                                   |
|  Layer 2:  Pointer + Keyboard                                     |
|            Pointer class -- tracks x,y, fires pointerDown/Move/Up |
|            Keyboard -- withModifierKeys(), keyPress(), undo()     |
|                                                                   |
+------------------------------------------------------------------+
|                                                                   |
|  Layer 1:  API + GlobalTestState                                  |
|            API.createElement() -- factory with defaults           |
|            API.setElements() / API.setSelectedElements()          |
|            window.h -- direct access to app internals             |
|            GlobalTestState -- shared render result, canvas refs   |
|                                                                   |
+------------------------------------------------------------------+
|                                                                   |
|  Layer 0:  @testing-library/react + custom render                 |
|            Custom render() that waits for canvas + app init       |
|            Custom queries: getByToolName()                        |
|            Custom matchers: toCloselyEqualPoints()                |
|                                                                   |
+------------------------------------------------------------------+
```

Let's walk through each layer.

---

### Layer 0: Custom Render and Queries

The `test-utils.ts` file wraps `@testing-library/react`'s `render` with
Excalidraw-specific setup:

```typescript
const renderApp: TestRenderFn = async (ui, options) => {
  Pointer.resetAll();  // no state leaks between tests

  const renderResult = render(ui, {
    queries: customQueries,  // includes getByToolName
    ...options,
  });

  GlobalTestState.renderResult = renderResult;

  // Wire up canvas references as lazy getters
  Object.defineProperty(GlobalTestState, "interactiveCanvas", {
    get() {
      return renderResult.container.querySelector("canvas.interactive")!;
    },
  });

  // Wait for app to fully initialize
  await waitFor(() => {
    if (!renderResult.container.querySelector("canvas.static")) {
      throw new Error("not initialized yet");
    }
    if (globalThis.h.state.isLoading) {
      throw new Error("still loading");
    }
  });

  return renderResult;
};
```

The key insight: they **wait for two canvases** (static + interactive) and for
`isLoading` to be false before proceeding. This eliminates race conditions
that would otherwise plague canvas testing.

Custom tool queries let tests do `getByToolName("rectangle")` instead of
fragile CSS selectors:

```typescript
const _getAllByToolName = (container, tool) => {
  const toolTitle = tool === "lock" ? "lock" : TOOL_TYPE[tool];
  return queries.getAllByTestId(container, `toolbar-${toolTitle}`);
};

export const [queryByToolName, getAllByToolName, getByToolName, ...] =
  buildQueries(_getAllByToolName, getMultipleError, getMissingError);
```

---

### Layer 1: The `window.h` Test Hook and the `API` Class

This is the linchpin. Excalidraw's `App` component exposes a global `h`
object during tests:

```
window.h
  |
  +-- h.elements      Current scene elements array
  +-- h.state         Current AppState
  +-- h.app           App component instance
  +-- h.history       History instance (undo/redo stacks)
  +-- h.store         Store instance (snapshots)
  +-- h.setState()    Directly update state
  +-- h.scene         Scene manager
```

The `API` class wraps `h` in a clean, static interface:

```typescript
export class API {
  static setElements = (elements) => {
    act(() => { h.elements = elements; });
  };

  static getSelectedElements = () => {
    return getSelectedElements(h.elements, h.state);
  };

  static getSelectedElement = () => {
    const selected = API.getSelectedElements();
    if (selected.length !== 1) {
      throw new Error(`expected 1; got ${selected.length}`);
    }
    return selected[0];
  };

  static executeAction = (action) => {
    act(() => { h.app.actionManager.executeAction(action); });
  };

  static createElement = ({ type = "rectangle", x = 0, y, width = 100, ... }) => {
    // Factory that creates any element type with smart defaults
    // Handles rectangles, ellipses, diamonds, text, arrows,
    // lines, freedraw, images, frames, embeddables, iframes
  };
}
```

The `createElement` factory is **not** a mouse simulation -- it directly
creates element objects. This is useful when you need scene setup but don't
care about the drawing interaction itself.

---

### Layer 2: Pointer and Keyboard

The `Pointer` class tracks cursor position and dispatches pointer events:

```typescript
export class Pointer {
  public clientX = 0;
  public clientY = 0;

  constructor(
    private readonly pointerType: "mouse" | "touch" | "pen",
    private readonly pointerId = 1,
  ) {}

  private getEvent() {
    return {
      clientX: this.clientX,
      clientY: this.clientY,
      pointerType: this.pointerType,
      pointerId: this.pointerId,
      altKey, shiftKey, ctrlKey,  // from Keyboard context
    };
  }

  // Incremental movement (deltas)
  move(dx, dy) {
    this.clientX += dx;
    this.clientY += dy;
    fireEvent.pointerMove(GlobalTestState.interactiveCanvas, this.getEvent());
  }

  down(dx = 0, dy = 0) { this.move(dx, dy); fireEvent.pointerDown(...); }
  up(dx = 0, dy = 0)   { this.move(dx, dy); fireEvent.pointerUp(...);   }
  click(dx = 0, dy = 0) { this.down(dx, dy); this.up(); }

  // Absolute positioning
  moveTo(x, y)   { this.clientX = x; this.clientY = y; fireEvent.pointerMove(...); }
  downAt(x, y)   { this.clientX = x; this.clientY = y; fireEvent.pointerDown(...); }
  clickAt(x, y)  { this.downAt(x, y); this.upAt(); }

  // High-level: click on an element by computing its position
  clickOn(element) {
    this.reset();
    this.click(...getElementPointForSelection(element, elementsMap));
    this.reset();
  }

  // Select one or more elements (shift-click)
  select(elements) {
    API.clearSelection();
    Keyboard.withModifierKeys({ shift: true }, () => {
      for (const element of elements) {
        this.click(...getElementPointForSelection(element, elementsMap));
      }
    });
  }
}
```

Two modes of positioning solve different needs:
- **Incremental** (`down/move/up` with deltas) is natural for drawing gestures
- **Absolute** (`downAt/moveTo/upAt`) is better for precise coordinate tests

The `Keyboard` helper manages modifier key state with scoped contexts:

```typescript
export const Keyboard = {
  withModifierKeys(modifiers, cb) {
    // Set alt/shift/ctrl flags, run callback, restore
    altKey = !!modifiers.alt;
    shiftKey = !!modifiers.shift;
    ctrlKey = !!modifiers.ctrl;
    try { cb(); }
    finally { /* restore previous values */ }
  },

  keyPress(key) { Keyboard.keyDown(key); Keyboard.keyUp(key); },
  undo()  { Keyboard.withModifierKeys({ ctrl: true }, () => Keyboard.keyPress("z")); },
  redo()  { Keyboard.withModifierKeys({ ctrl: true, shift: true }, () => Keyboard.keyPress("z")); },
};
```

This is elegant: modifier keys are **ambient state** that automatically flow
into all Pointer and Keyboard events fired within the callback.

---

### Layer 3: The `UI` Helper

`UI` composes everything into intent-level operations:

```typescript
export const UI = {
  clickTool(toolName) {
    fireEvent.click(GlobalTestState.renderResult.getByToolName(toolName));
  },

  createElement(type, { x, y, width, height } = {}) {
    UI.clickTool(type);

    if (type === "text") {
      mouse.click(x, y);
    } else {
      mouse.down(x, y);
      mouse.reset();
      mouse.up(x + width, y + height);
    }

    const origElement = h.elements.at(-1);
    return proxy(origElement);  // <-- returns a live Proxy
  },
};
```

The **Proxy pattern** is a standout design choice. When Excalidraw processes
an interaction, it often recreates element objects (immutable updates).
A raw reference would go stale. The proxy solves this:

```typescript
const proxy = (element) => {
  return new Proxy({}, {
    get(target, prop) {
      // Always read from the CURRENT elements array
      const current = h.elements.find(({ id }) => id === element.id);
      if (prop === "get") return () => current;
      return current[prop];
    },
  });
};
```

Now test code can do:

```typescript
const rect = UI.createElement("rectangle", { x: 10, y: 10, width: 100, height: 50 });
// ... many interactions later ...
expect(rect.width).toBe(200);  // always reads the latest value
```

---

## How Real Tests Look

### Example 1: Drawing a Rectangle via Drag

The most basic integration test. Render the app, select a tool, drag on the
canvas, verify the element.

```typescript
it("rectangle", async () => {
  const { getByToolName, container } = await render(<Excalidraw />);

  // Select the rectangle tool
  fireEvent.click(getByToolName("rectangle"));
  const canvas = container.querySelector("canvas.interactive")!;

  // Drag from (30,20) to (60,70)
  fireEvent.pointerDown(canvas, { clientX: 30, clientY: 20 });
  fireEvent.pointerMove(canvas, { clientX: 60, clientY: 70 });
  fireEvent.pointerUp(canvas);

  // Verify the created element
  expect(h.elements.length).toEqual(1);
  expect(h.elements[0].type).toEqual("rectangle");
  expect(h.elements[0].x).toEqual(30);
  expect(h.elements[0].y).toEqual(20);
  expect(h.elements[0].width).toEqual(30);   // 60 - 30
  expect(h.elements[0].height).toEqual(50);  // 70 - 20
});
```

### Example 2: Box Selection with Shift Key

Uses the helper abstractions for a more complex interaction:

```typescript
it("should allow adding to selection via box-select when holding shift", async () => {
  await render(<Excalidraw />);

  const rect1 = API.createElement({ type: "rectangle", x: 0, y: 0, width: 50, height: 50 });
  const rect2 = API.createElement({ type: "rectangle", x: 100, y: 0, width: 50, height: 50 });
  API.setElements([rect1, rect2]);

  // Box-select just rect2
  mouse.downAt(175, -20);
  mouse.moveTo(85, 70);
  mouse.up();
  assertSelectedElements([rect2.id]);

  // Hold shift and box-select rect1 too
  Keyboard.withModifierKeys({ shift: true }, () => {
    mouse.downAt(75, -20);
    mouse.moveTo(-15, 70);
    mouse.up();
  });

  assertSelectedElements([rect2.id, rect1.id]);
});
```

Notice the pattern: `API.createElement` + `API.setElements` for scene setup,
`Pointer` for interaction, `assertSelectedElements` for verification.

### Example 3: Arrow Binding to a Shape

Tests the binding system by drawing a shape, then drawing an arrow inside it:

```typescript
it("should create an `inside` binding", () => {
  // Draw a rectangle
  UI.clickTool("rectangle");
  mouse.downAt(100, 100);
  mouse.moveTo(200, 200);
  mouse.up();

  const rect = API.getSelectedElement();

  // Draw an arrow inside the rectangle
  UI.clickTool("arrow");
  mouse.downAt(110, 110);
  mouse.moveTo(160, 160);
  mouse.up();

  const arrow = API.getSelectedElement();

  // Arrow should bind to the rectangle at both ends
  expect(arrow.startBinding?.elementId).toBe(rect.id);
  expect(arrow.endBinding?.elementId).toBe(rect.id);
  expect(arrow.startBinding.mode).toBe("inside");
});
```

### Example 4: Keyboard Shortcut with Dialog

Tests a shortcut that triggers a confirmation dialog:

```typescript
it("Clear canvas shortcut should display confirm dialog", async () => {
  await render(
    <Excalidraw
      initialData={{ elements: [API.createElement({ type: "rectangle" })] }}
      handleKeyboardGlobally
    />,
  );

  expect(globalThis.h.elements.length).toBe(1);

  Keyboard.withModifierKeys({ ctrl: true }, () => {
    Keyboard.keyDown(KEYS.DELETE);
  });

  // Verify dialog appeared
  const confirmDialog = document.querySelector(".confirm-dialog")!;
  expect(confirmDialog).not.toBe(null);

  // Click confirm
  fireEvent.click(confirmDialog.querySelector('[aria-label="Confirm"]')!);

  await waitFor(() => {
    expect(globalThis.h.elements[0].isDeleted).toBe(true);
  });
});
```

### Example 5: Tool Locking

Tests that a locked tool remains active after drawing:

```typescript
it("should support tool locking", async () => {
  expect(h.state.activeTool.type).toBe("selection");

  act(() => {
    excalidrawAPI.setActiveTool({ type: "rectangle", locked: true });
  });
  expect(h.state.activeTool.type).toBe("rectangle");

  // Draw a rectangle
  mouse.down(10, 10);
  mouse.up(20, 20);

  // Tool stays as rectangle (locked), doesn't revert to selection
  expect(h.state.activeTool.type).toBe("rectangle");
});
```

### Example 6: Multi-Touch with Separate Pointer Instances

The regression test file creates multiple pointer instances for touch testing:

```typescript
const mouse   = new Pointer("mouse");
const finger1 = new Pointer("touch", 1);
const finger2 = new Pointer("touch", 2);
```

Each pointer tracks its own position independently and uses a different
`pointerId`, enabling pinch-to-zoom and multi-finger gesture tests.

---

## Pure Unit Tests: The Math Package

The `packages/math` tests are straightforward input/output tests for geometry
primitives. They use a custom `toCloselyEqualPoints` matcher to handle float
precision:

```typescript
describe("Math curve", () => {
  it("intersection point is found", () => {
    const c = curve(
      pointFrom(100, 0),
      pointFrom(100, 100),
      pointFrom(100, 100),
      pointFrom(0, 100),
    );
    const l = lineSegment(pointFrom(0, 0), pointFrom(200, 200));

    expect(curveIntersectLineSegment(c, l)).toCloselyEqualPoints([
      [87.5, 87.5],
    ]);
  });
});
```

The `toCloselyEqualPoints` matcher (from `@excalidraw/utils/test-utils.ts`):

```typescript
expect.extend({
  toCloselyEqualPoints(received, expected, precision) {
    const COMPARE = Math.pow(10, precision ?? 2);
    const pass = expected.every(
      (point, idx) =>
        Math.abs(received[idx][0] - point[0]) < COMPARE &&
        Math.abs(received[idx][1] - point[1]) < COMPARE,
    );
    // ... error message with jest-diff
  },
});
```

The simplest tests are almost trivial but still guard edge cases:

```typescript
describe("Vector", () => {
  test("isVector", () => {
    expect(isVector([5, 5])).toBe(true);
    expect(isVector(null)).toBe(false);
    expect(isVector([5, Number.NaN])).toBe(false);
  });
});
```

---

## Snapshot Strategy

Excalidraw uses snapshots in two distinct ways:

### 1. Element Snapshots (full state capture)

After creating elements, snapshot the entire object to catch regressions:

```typescript
expect(h.elements.length).toMatchSnapshot();
for (const element of h.elements) {
  expect(element).toMatchSnapshot();
}
```

### 2. Checkpoint Snapshots (named regression baselines)

The regression test suite takes named checkpoints that capture render count,
app state, all elements, and the full undo/redo history:

```typescript
const checkpoint = (name) => {
  expect(renderStaticScene.mock.calls.length)
    .toMatchSnapshot(`[${name}] number of renders`);
  expect(h.state).toMatchSnapshot(`[${name}] appState`);
  expect(h.elements.length).toMatchSnapshot(`[${name}] number of elements`);
  for (const [i, el] of h.elements.entries()) {
    expect(el).toMatchSnapshot(`[${name}] element ${i}`);
  }
  checkpointHistory(h.history, name);
};

afterEach(() => {
  checkpoint("end of test");  // auto-checkpoint at end of every test
});
```

### Float Precision Serializer

A custom snapshot serializer prevents flaky tests from IEEE 754 differences:

```typescript
expect.addSnapshotSerializer({
  serialize(val, config, indentation, depth, refs, printer) {
    return printer(val.toFixed(5), config, indentation, depth, refs);
  },
  test(val) {
    return typeof val === "number" && Number.isFinite(val) && !Number.isInteger(val);
  },
});
```

All floating point numbers are rounded to 5 decimal places in snapshots.

---

## The Mock Landscape

```
+----------------------+------------------------------+----------------------------+
| What's Mocked        | How                          | Why                        |
+----------------------+------------------------------+----------------------------+
| <canvas> 2D context  | vitest-canvas-mock           | jsdom has no canvas        |
| setPointerCapture    | vi.fn() on prototype         | jsdom limitation           |
| FontFace + fonts     | Mock class + vi.fn()         | No font loading            |
| ClipboardEvent       | Custom polyfill class        | jsdom doesn't have it      |
| DataTransfer         | Custom polyfill class        | jsdom doesn't have it      |
| IndexedDB            | fake-indexeddb/auto          | Persistence tests          |
| matchMedia           | vi.fn() with mock impl       | No media queries           |
| HTMLImageElement      | vi.stubGlobal("Image", ...)  | No image loading           |
| getBoundingClientRect | Override on prototype        | jsdom returns all zeros    |
| ResizeObserver       | Inline class mock            | Radix-UI dependency        |
| Element seeds        | reseed(7) in beforeEach      | Deterministic IDs          |
| DateTime             | setDateTimeForTests()        | Deterministic timestamps   |
| Font fetch           | Class override -> fs.readFile| Read from disk, not HTTP   |
+----------------------+------------------------------+----------------------------+
```

---

## The `assertElements` Power Tool

For complex tests that need to verify element order, properties, and selection
simultaneously, Excalidraw has a custom `assertElements` helper:

```typescript
assertElements(h.elements, [
  { id: rect1.id, type: "rectangle", x: 0, y: 0, selected: true },
  { id: rect2.id, type: "rectangle", x: 100, y: 0 },
  { id: arrow.id, type: "arrow", startBinding: { elementId: rect1.id } },
]);
```

It only compares the properties you specify (ignoring the rest), checks
element order, and verifies selected state. On failure, it produces
color-coded diffs showing which elements are in the wrong position.

---

## What They Don't Test

It is worth noting what is absent from Excalidraw's test strategy:

- **No real browser tests** -- Everything runs in jsdom. Canvas rendering
  output is never visually verified.
- **No visual regression tests** -- `vitest-canvas-mock` provides a mock 2D
  context, so `getImageData()` returns empty data. They cannot assert on
  pixels.
- **No E2E tests** -- No Playwright, Cypress, or similar. The full-app render
  in jsdom is their highest-level test.
- **No cross-browser testing** -- jsdom only.
- **No accessibility tests** -- No axe-core or similar auditing.
- **Moderate coverage targets** -- 60-70%, not 90%+. They accept that some
  rendering paths are untestable in jsdom.

This is a deliberate tradeoff: **speed and developer experience over pixel-level
confidence**. Their tests run fast, are easy to write, and catch the vast
majority of interaction bugs. The missing coverage is in areas that would
require a real browser (visual rendering, cross-browser quirks).

---

## Key Design Decisions and Why

### 1. Full-app render over component isolation

Most tests render `<Excalidraw />` -- the entire app. Not `<Toolbar />` or
`<Canvas />` individually. This means:

- Tests exercise real action dispatch, state management, and re-rendering
- No mock wiring between components
- Higher confidence that user workflows actually work
- Slightly slower per-test, but the jsdom environment keeps it manageable

### 2. Global `window.h` hook over prop drilling

Instead of threading state through test props or context, they expose a
global `h` object. This is a pragmatic choice for a complex app:

- Tests can read any internal state directly
- No need to reconstruct state from DOM queries
- Allows testing things that have no DOM representation (undo stacks, element
  order, binding state)
- The downside: tests are coupled to internal structure

### 3. Pointer class over raw fireEvent

Instead of calling `fireEvent.pointerDown()` everywhere, the `Pointer` class
manages position state. This prevents an entire class of bugs where tests
forget to update coordinates between events.

### 4. Proxy elements over stale references

The `UI.createElement()` proxy pattern is worth studying. In an immutable-data
architecture, any state change creates new objects. Without the proxy, you'd
need to re-fetch elements after every interaction. The proxy does this
transparently.

### 5. Deterministic seeding

`reseed(7)` in every `beforeEach` ensures element IDs are reproducible across
runs. Without this, snapshot tests would fail every time because IDs would be
random.

---

## Summary

Excalidraw's testing strategy can be described in one sentence: **render the
whole app in jsdom, simulate what the user does with mouse and keyboard
helpers, then inspect internal state directly through a global hook.**

```
User intent:    "draw a rectangle"
                        |
                        v
Test code:      UI.clickTool("rectangle")
                mouse.down(10, 10)
                mouse.up(110, 60)
                        |
                        v
Helpers fire:   fireEvent.click(toolbar)
                fireEvent.pointerDown(canvas, {clientX:10, clientY:10})
                fireEvent.pointerUp(canvas, {clientX:110, clientY:60})
                        |
                        v
App processes:  Tool activated -> pointerDown handler -> element created
                        |
                        v
Test asserts:   expect(h.elements[0].type).toBe("rectangle")
                expect(h.elements[0].width).toBe(100)
                expect(h.elements[0].height).toBe(50)
```

The approach works because:

1. The helper layer (`Pointer`, `Keyboard`, `UI`, `API`) abstracts away the
   verbosity of DOM event simulation
2. The `window.h` hook provides deep inspection without DOM scraping
3. Snapshots catch regressions automatically, with float precision handled
4. Custom matchers (`toCloselyEqualPoints`, `assertElements`) make assertions
   readable and failure messages actionable
5. Deterministic seeding makes everything reproducible

It is not a strategy that works for every app. It works for Excalidraw because
their UI is **canvas-driven** (not DOM-driven), so DOM-level rendering fidelity
matters less than interaction correctness. For a form-heavy CRUD app, you'd
want more component-level tests. For Excalidraw, the interaction-level
integration tests are exactly right.
