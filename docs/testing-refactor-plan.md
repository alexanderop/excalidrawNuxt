# Testing Refactor: Inverting the Pyramid with Real Browsers

## The Problem

Our current test suite has a **right-side-up pyramid**: ~33 unit tests running
in Node, ~10 browser tests running in Chromium. Most of our test code
exercises composable logic in isolation with mocked events and stubbed DOM.

But most bugs in a drawing app live at the **intersection of interactions** --
tool switch, canvas drag, modifier key, element mutation, re-render. Testing
these individually in Node with mocked `useEventListener` catches some bugs
but misses the real failure modes.

Excalidraw learned this and inverted their pyramid: 80% of their tests render
the full app and simulate real interactions. We should do the same -- but
instead of their jsdom + canvas-mock approach, we use **Vitest browser mode
with Playwright** and get real pixels for free.

---

## Target Architecture

```
                BEFORE                              AFTER
                ------                              -----

          /\                                  /\
         /  \      Screenshot                /  \       Screenshot
        /    \     (few)                    /    \      (~15 tests)
       /------\                            /------\
      /        \   Browser                /        \
     /          \  (~10 tests)           /          \
    /------------\                      /  Browser    \
   /              \                    / Integration   \
  / Unit tests     \                  / (~60 tests)     \
 /  (~33 tests)     \                /-------------------\
/____________________\              / Unit tests (~20)    \
                                   /_______________________\
```

The inversion means:

- **Browser integration tests become the default.** Every new feature gets
  tested by rendering `CanvasContainer`, simulating the interaction, and
  asserting the result.
- **Unit tests shrink to pure logic.** Math, coordinate transforms, element
  factories, type guards. Things with no DOM dependency.
- **Screenshot tests grow.** With a real canvas and deterministic seeding,
  visual regression coverage is cheap to add.

---

## The Four Big Changes

```
+===================================================================+
|                                                                   |
|  1. Add a test hook (window.h equivalent)                         |
|     Expose reactive state for direct assertions                   |
|                                                                   |
|  2. Build richer browser helpers (Excalidraw-grade)               |
|     Pointer with modifiers, Keyboard.withModifierKeys,            |
|     API class, assertElements, element proxy                      |
|                                                                   |
|  3. Promote unit tests to browser tests                           |
|     Drawing interaction, selection interaction, tool switching,    |
|     text editing -- all move to browser                           |
|                                                                   |
|  4. Adopt snapshot + checkpoint patterns                           |
|     Element snapshots, history checkpoints,                       |
|     float serializer, toCloselyEqualPoints                        |
|                                                                   |
+===================================================================+
```

---

## Change 1: The Test Hook (`window.h`)

Excalidraw's most powerful testing pattern is their global `window.h` object.
Every test can directly read elements, state, and history without scraping the
DOM. We need an equivalent.

### What to expose

```typescript
// app/__test-utils__/testHook.ts

export interface TestHook {
  // Elements
  elements: ShallowRef<readonly ExcalidrawElement[]>
  elementMap: ElementsMap
  addElement: (element: ExcalidrawElement) => void
  replaceElements: (newElements: readonly ExcalidrawElement[]) => void
  getElementById: (id: string) => ExcalidrawElement | undefined

  // Selection
  selectedIds: ShallowRef<ReadonlySet<string>>
  selectedElements: ComputedRef<ExcalidrawElement[]>
  select: (id: string) => void
  addToSelection: (id: string) => void
  clearSelection: () => void
  replaceSelection: (ids: Set<string>) => void
  isSelected: (id: string) => boolean

  // Tools
  activeTool: ShallowRef<ToolType>
  setTool: (tool: ToolType) => void

  // Viewport
  scrollX: Ref<number>
  scrollY: Ref<number>
  zoom: Ref<number>
  panBy: (dx: number, dy: number) => void
  zoomBy: (delta: number, center?: { x: number; y: number }) => void
  toScene: (screenX: number, screenY: number) => { x: number; y: number }

  // In-progress state
  newElement: ShallowRef<ExcalidrawElement | null>
  multiElement: ShallowRef<ExcalidrawElement | null>
  editingTextElement: ShallowRef<ExcalidrawElement | null>

  // Rendering
  markStaticDirty: () => void
  markInteractiveDirty: () => void
}
```

### How to wire it

In `CanvasContainer.vue`, at the bottom of `<script setup>`, conditionally
expose to the window:

```typescript
// At the end of CanvasContainer.vue <script setup>
if (import.meta.env.MODE === 'test' || import.meta.env.DEV) {
  ;(window as any).__h = {
    elements, elementMap, addElement, replaceElements, getElementById,
    selectedIds, selectedElements, select, addToSelection,
    clearSelection, replaceSelection, isSelected,
    activeTool, setTool,
    scrollX, scrollY, zoom, panBy, zoomBy, toScene,
    newElement, multiElement, editingTextElement: editingTextElement,
    markStaticDirty, markInteractiveDirty,
  } satisfies TestHook
}
```

### How tests consume it

```typescript
// app/__test-utils__/browser/api.ts

function getH(): TestHook {
  const h = (window as any).__h
  if (!h) throw new Error('Test hook not available -- is CanvasContainer mounted?')
  return h
}
```

### Why this matters

Without the test hook, browser tests can only assert on what's visible in the
DOM (`aria-pressed`, element counts via `querySelectorAll`). With it, tests
can assert on:

- Exact element positions and dimensions after a drag
- Which element IDs are selected
- Active tool state without DOM queries
- Viewport scroll/zoom values
- Binding relationships between elements
- Element order (z-index)

This is the single biggest improvement from Excalidraw's approach.

---

## Change 2: Richer Browser Helpers

Our current helpers are thin wrappers. Excalidraw's are feature-rich. Here's
what to add:

### 2a. API object (Excalidraw's direct-manipulation layer)

**Note**: Implemented as an object literal with getters, not a class with
static methods (simpler, same ergonomics):

```typescript
// app/__test-utils__/browser/api.ts

export const API = {
  get h(): TestHook { return getH() },
  get elements(): readonly ExcalidrawElement[] { return API.h.elements.value },
  setElements(elements) { API.h.replaceElements(elements) },
  getSelectedElements() { return API.h.selectedElements.value },
  getSelectedElement() { /* throws if !== 1 selected */ },
  setSelectedElements(elements) { API.h.replaceSelection(new Set(elements.map(e => e.id))) },
  clearSelection() { API.h.clearSelection() },
  addElement(overrides?) { /* creates + adds to scene, returns element */ },
  getElementByID(id) { return API.h.getElementById(id) },
  get activeTool() { return API.h.activeTool.value },
  setTool(tool) { API.h.setTool(tool) },
  get scrollX() { return API.h.scrollX.value },
  get scrollY() { return API.h.scrollY.value },
  get zoom() { return API.h.zoom.value },
}
```

**This unlocks a critical pattern**: scene setup without mouse simulation.
Need 3 rectangles on the canvas for a selection test? Don't draw them --
inject them:

```typescript
it('box-selects multiple elements', async () => {
  render(CanvasContainer)
  await waitForCanvasReady()

  const r1 = API.addElement({ x: 100, y: 100, width: 50, height: 50 })
  const r2 = API.addElement({ x: 200, y: 100, width: 50, height: 50 })
  API.h.markStaticDirty()
  await waitForPaint()

  // Now test the actual interaction: box-select
  await grid.drag([1, 1], [5, 3])

  expect(API.getSelectedElements().map(e => e.id)).toEqual([r1.id, r2.id])
})
```

### 2b. Pointer with modifier keys

Excalidraw's `Pointer` carries ambient modifier state via
`Keyboard.withModifierKeys`. Our current `Pointer` passes modifiers per-call.
We should add both modes:

```typescript
// app/__test-utils__/browser/Pointer.ts (extended)

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

  async clickAt(x: number, y: number, opts?: ModifierKeys): Promise<void> {
    this.x = x
    this.y = y
    await commands.canvasClick(CANVAS_SELECTOR, x, y, { ...this.modifiers, ...opts })
  }

  async drag(sx: number, sy: number, ex: number, ey: number, opts?: { steps?: number }): Promise<void> {
    this.x = ex
    this.y = ey
    await commands.canvasDrag(CANVAS_SELECTOR, sx, sy, ex, ey, opts)
  }

  /** Click on an element's center (Excalidraw pattern) */
  async clickOn(element: ExcalidrawElement): Promise<void> {
    const cx = element.x + element.width / 2
    const cy = element.y + element.height / 2
    await this.clickAt(cx, cy)
  }

  /** Shift-click multiple elements to select them (Excalidraw pattern) */
  async select(elements: ExcalidrawElement | ExcalidrawElement[]): Promise<void> {
    const els = Array.isArray(elements) ? elements : [elements]
    if (els.length === 0) return
    // Click first element without shift
    await this.clickOn(els[0]!)
    // Shift-click the rest
    for (const el of els.slice(1)) {
      await this.clickOn(el, { shiftKey: true })
    }
  }
}
```

### 2c. Keyboard with modifier context

```typescript
// app/__test-utils__/browser/Keyboard.ts (extended)

export class Keyboard {
  async press(key: string): Promise<void> {
    await userEvent.keyboard(key)
  }

  /** Modifier key context (Excalidraw pattern) */
  async withModifierKeys(mods: ModifierKeys, fn: () => Promise<void>): Promise<void> {
    const downs: string[] = []
    if (mods.shiftKey) downs.push('{Shift>}')
    if (mods.ctrlKey) downs.push('{Control>}')
    if (mods.altKey) downs.push('{Alt>}')
    if (mods.metaKey) downs.push('{Meta>}')

    // Press modifier keys down
    for (const key of downs) await userEvent.keyboard(key)
    await fn()
    // Release modifier keys
    for (const key of downs.reverse()) {
      await userEvent.keyboard(key.replace('>', '/}').replace('}/', '/'))
    }
  }

  async undo(): Promise<void> {
    await userEvent.keyboard('{Control>}z{/Control}')
  }

  async redo(): Promise<void> {
    await userEvent.keyboard('{Control>}{Shift>}z{/Shift}{/Control}')
  }
}
```

### 2d. UI with createElement returning current-element accessor

Excalidraw returns a Proxy from `UI.createElement` that always reads the
latest element state. In Vue, we don't have their immutable-update problem
(elements are mutated in place via `shallowRef` reassignment), but we DO
need a way to reference "the element I just drew" after it gets re-rendered.

```typescript
// app/__test-utils__/browser/UI.ts (extended)

export class UI {
  // ...existing methods...

  /** Draw an element and return a live accessor to it */
  async createElement(
    tool: string,
    start: Cell,
    end: Cell,
  ): Promise<{ get: () => ExcalidrawElement; id: string }> {
    const beforeCount = API.elements.length
    await this.createElementAtCells(tool, start, end)
    await waitForPaint()

    const el = API.elements[API.elements.length - 1]
    if (!el || API.elements.length <= beforeCount) {
      throw new Error(`createElement(${tool}) did not produce an element`)
    }

    return {
      id: el.id,
      get: () => API.getElementById(el.id) ?? el,
    }
  }

  async selectElement(element: ExcalidrawElement): Promise<void> {
    await this.pointer.clickOn(element)
  }

  async group(): Promise<void> {
    await this.keyboard.withModifierKeys({ ctrlKey: true }, async () => {
      await this.keyboard.press('g')
    })
  }

  async ungroup(): Promise<void> {
    await this.keyboard.withModifierKeys({ ctrlKey: true, shiftKey: true }, async () => {
      await this.keyboard.press('g')
    })
  }

  async deleteSelected(): Promise<void> {
    await this.keyboard.press('{Delete}')
  }
}
```

### 2e. Custom assertions (from Excalidraw)

```typescript
// app/__test-utils__/matchers/toCloselyEqualPoints.ts

expect.extend({
  toCloselyEqualPoints(received, expected, precision = 2) {
    const COMPARE = Math.pow(10, precision)
    const pass = expected.every(
      (point, idx) =>
        Math.abs(received[idx][0] - point[0]) < COMPARE &&
        Math.abs(received[idx][1] - point[1]) < COMPARE,
    )
    return {
      pass,
      message: () => pass
        ? `expected points to NOT closely equal ${JSON.stringify(expected)}`
        : `expected points to closely equal\n` +
          `  Expected: ${JSON.stringify(expected)}\n` +
          `  Received: ${JSON.stringify(received)}`,
    }
  },
})
```

```typescript
// app/__test-utils__/matchers/assertElements.ts

export function assertElements(
  actual: readonly ExcalidrawElement[],
  expected: { id: string; selected?: true; [key: string]: unknown }[],
) {
  // Check order
  expect(actual.map(e => e.id)).toEqual(expected.map(e => e.id))

  // Check properties (only the ones specified in expected)
  for (const exp of expected) {
    const act = actual.find(e => e.id === exp.id)
    expect(act).toBeDefined()
    for (const [key, value] of Object.entries(exp)) {
      if (key === 'selected') continue
      expect((act as any)[key]).toEqual(value)
    }
  }

  // Check selection
  const expectedSelected = expected.filter(e => e.selected).map(e => e.id)
  const actualSelected = API.getSelectedElements().map(e => e.id)
  expect(actualSelected.sort()).toEqual(expectedSelected.sort())
}
```

```typescript
// app/__test-utils__/matchers/assertSelectedElements.ts

export function assertSelectedElements(...ids: string[]) {
  const selected = API.getSelectedElements().map(e => e.id)
  expect(selected.length).toBe(ids.length)
  expect(selected).toEqual(expect.arrayContaining(ids))
}
```

---

## Change 3: Promote Unit Tests to Browser

The following unit tests simulate events via mocked `useEventListener`.
They should become browser tests that simulate events for real:

### Tests to promote

```
PROMOTE TO BROWSER (test real interactions)
-------------------------------------------
useDrawingInteraction.unit.test.ts    -> drawing.browser.test.ts
useSelection.unit.test.ts             -> selection.browser.test.ts
useTool.unit.test.ts                  -> tools.browser.test.ts (partially there)
arrowTool.unit.test.ts                -> arrowTool.browser.test.ts
useMultiPointCreation.unit.test.ts    -> multiPoint.browser.test.ts
useLinearEditor.unit.test.ts          -> linearEditor.browser.test.ts

KEEP AS UNIT (pure logic, no interactions)
------------------------------------------
createElement.unit.test.ts            -- pure factory, no DOM
mutateElement.unit.test.ts            -- pure mutation, no DOM
hitTest.unit.test.ts                  -- pure math
bounds.unit.test.ts                   -- pure math
coords.unit.test.ts                   -- pure math
math.unit.test.ts                     -- pure math
resizeElement.unit.test.ts            -- pure geometry
transformHandles.unit.test.ts         -- pure geometry
dragElements.unit.test.ts             -- pure geometry
renderGrid.unit.test.ts              -- pure function
colors.unit.test.ts                   -- pure function
tryCatch.unit.test.ts                 -- pure function
random.unit.test.ts                   -- pure function
types.unit.test.ts                    -- type guards
groupUtils.unit.test.ts               -- pure logic
elementSnapshot.unit.test.ts          -- pure logic
proximity.unit.test.ts                -- pure math
bindUnbind.unit.test.ts               -- pure logic
updateBoundPoints.unit.test.ts        -- pure logic
pointHandles.unit.test.ts             -- pure logic

KEEP AS UNIT BUT CONSIDER BROWSER SUPPLEMENT
---------------------------------------------
renderElement.unit.test.ts            -- keep unit for logic, add browser screenshot
renderScene.unit.test.ts              -- keep unit for logic, add browser screenshot
renderPerformance.unit.test.ts        -- keep unit for perf assertions
useViewport.unit.test.ts              -- keep unit, add browser pan/zoom test
useAnimationController.unit.test.ts   -- keep unit
CanvasGrid.unit.test.ts               -- keep unit (pure coordinate math)
```

### What the promoted tests look like

**Before** (unit test with mocked events):

```typescript
// useDrawingInteraction.unit.test.ts
vi.mock('@vueuse/core', () => ({
  useEventListener: (_target, event, handler) => { ... },
}))

it('creates a rectangle on drag', () => {
  using result = withSetup(() => useDrawingInteraction({ ... }))

  fire('pointerdown', { offsetX: 100, offsetY: 100 })
  fire('pointermove', { offsetX: 200, offsetY: 200 })
  fire('pointerup', { offsetX: 200, offsetY: 200 })

  expect(createdElement.type).toBe('rectangle')
})
```

**After** (browser test with real events):

```typescript
// drawing.browser.test.ts
it('creates a rectangle on drag', async () => {
  render(CanvasContainer)
  await waitForCanvasReady()

  await ui.createElementAtCells('rectangle', [2, 2], [5, 5])

  expect(API.elements.length).toBe(1)
  expect(API.elements[0].type).toBe('rectangle')
  expect(API.elements[0].width).toBeGreaterThan(0)
  expect(API.elements[0].height).toBeGreaterThan(0)
  expect(API.activeTool).toBe('selection')
})
```

The browser test is:
- Shorter (no mock setup)
- More confident (real events, real canvas, real state)
- More readable (describes intent, not wiring)
- No `vi.mock`, no `eventHandlers.clear()`, no `withSetup`

---

## Change 4: Snapshot and Checkpoint Patterns

### 4a. Element snapshots with float serializer

Adopt Excalidraw's snapshot serializer to prevent float precision flakiness:

```typescript
// app/__test-utils__/setup-browser.ts (add to existing)

expect.addSnapshotSerializer({
  serialize(val, config, indentation, depth, refs, printer) {
    return printer(val.toFixed(5), config, indentation, depth, refs)
  },
  test(val) {
    return typeof val === 'number' && Number.isFinite(val) && !Number.isInteger(val)
  },
})
```

Then use element snapshots for regression detection:

```typescript
it('creates element with correct properties', async () => {
  render(CanvasContainer)
  await waitForCanvasReady()

  await ui.createElementAtCells('rectangle', [2, 2], [5, 5])
  await waitForPaint()

  // Snapshot the full element (seed deterministic via reseed())
  expect(API.elements[0]).toMatchSnapshot()
})
```

### 4b. Checkpoint pattern for regression suites

Port Excalidraw's checkpoint pattern for comprehensive regression tests:

```typescript
// app/__test-utils__/browser/checkpoint.ts

export function checkpoint(name: string) {
  expect(API.elements.length).toMatchSnapshot(`[${name}] element count`)
  for (const [i, el] of API.elements.entries()) {
    expect(el).toMatchSnapshot(`[${name}] element ${i}`)
  }
  expect(API.activeTool).toMatchSnapshot(`[${name}] active tool`)
  expect([...API.h.selectedIds.value]).toMatchSnapshot(`[${name}] selected ids`)
}
```

Usage in regression test suites:

```typescript
describe('regression: draw and select workflow', () => {
  beforeEach(() => reseed())
  afterEach(() => restoreSeed())

  it('draw rect, draw ellipse, select both, group', async () => {
    render(CanvasContainer)
    await waitForCanvasReady()

    await ui.createElementAtCells('rectangle', [1, 1], [4, 4])
    checkpoint('after rectangle')

    await ui.createElementAtCells('ellipse', [5, 1], [8, 4])
    checkpoint('after ellipse')

    await grid.drag([0, 0], [9, 5])  // box-select both
    checkpoint('after box-select')

    await ui.group()
    checkpoint('after group')
  })
})
```

### 4c. Render count verification (from Excalidraw)

Excalidraw spies on render functions to catch unnecessary re-renders. We can
do the same by watching the dirty flag trigger count:

```typescript
it('should not trigger unnecessary static renders', async () => {
  render(CanvasContainer)
  await waitForCanvasReady()

  let staticRenderCount = 0
  const origMark = API.h.markStaticDirty
  API.h.markStaticDirty = () => { staticRenderCount++; origMark() }

  await ui.createElementAtCells('rectangle', [2, 2], [5, 5])

  // One static render when element is committed, not on every pointermove
  expect(staticRenderCount).toBe(1)
})
```

---

## New File Structure (current state)

```
app/__test-utils__/
  browser/
    Pointer.ts            <-- DONE: withModifiers, clickOn, select
    Keyboard.ts           <-- DONE: withModifierKeys, undo, redo
    UI.ts                 <-- DONE: createElement returns accessor, group/ungroup/delete
    CanvasGrid.ts         <-- KEEP (already good)
    api.ts                <-- DONE: API object (direct state manipulation)
    index.ts              <-- DONE: re-exports API, waiters, checkpoint
    checkpoint.ts         <-- DONE: checkpoint() snapshot pattern
    waiters.ts            <-- DONE: waitForCanvasReady, waitForPaint
  commands/
    canvasDrag.ts         <-- KEEP
    canvasClick.ts        <-- KEEP
    canvasDblClick.ts     <-- KEEP
    showGridOverlay.ts    <-- KEEP
  factories/
    element.ts            <-- KEEP (used by API.addElement)
    point.ts              <-- KEEP
    viewport.ts           <-- KEEP
  matchers/
    toCloselyEqualPoints.ts  <-- DONE
    assertElements.ts        <-- DONE
    assertSelectedElements.ts <-- DONE
  mocks/                  <-- KEEP for remaining unit tests
    eventListenerMock.ts
    canvasStub.ts
    canvasContextMock.ts
  serializers/
    floatSerializer.ts    <-- KEEP
    elementSerializer.ts  <-- KEEP
  withSetup.ts            <-- KEEP for remaining unit tests
  deterministicSeed.ts    <-- KEEP
  setup-browser.ts        <-- DONE: float snapshot serializer added
  testHook.ts             <-- DONE: TestHook type + getH() accessor
```

---

## Migration Strategy

### Phase 1: Foundation -- COMPLETE

1. [x] **Add test hook** to `CanvasContainer.vue` (`globalThis.__h`)
2. [x] **Create `api.ts`** with `API` object (note: object literal, not class)
3. [x] **Create matchers**: `toCloselyEqualPoints`, `assertSelectedElements`, `assertElements`
4. [x] **Add float snapshot serializer** to browser setup
5. [x] **Extend Pointer** with `clickOn()`, `select()`, `withModifiers()`
6. [x] **Extend Keyboard** with `withModifierKeys()`, `undo()`, `redo()`

### Phase 2: Promote interaction tests -- MOSTLY COMPLETE

7. [x] Promote `useDrawingInteraction.unit.test.ts` -> `drawing.browser.test.ts`
8. [x] Promote `useSelection.unit.test.ts` -> `selection.browser.test.ts`
9. [x] Write new `multiPoint.browser.test.ts` (multi-point arrow creation)
10. [x] Write new `linearEditor.browser.test.ts` (arrow point editing)
11. [ ] Expand existing `boundText.browser.test.ts` with more cases

### Phase 3: Rich assertions -- MOSTLY COMPLETE

12. [x] Create `assertElements` helper
13. [x] Create `checkpoint.ts` for regression suites
14. [ ] Write `regression.browser.test.ts` with checkpointed workflows
15. [ ] Add element snapshot tests with deterministic seeds

### Phase 4: Expand coverage -- TODO

16. [ ] Write `resize.browser.test.ts` (drag resize handles)
17. [ ] Write `group.browser.test.ts` (group/ungroup via keyboard)
18. [ ] Write `pan-zoom.browser.test.ts` (middle-click pan, scroll zoom)
19. [ ] Write `undo-redo.browser.test.ts` (when history is implemented)
20. [ ] Expand screenshot tests for each element type and interaction state

---

## What a Mature Test File Looks Like

After the refactor, the dominant test pattern should read like this:

```typescript
// app/features/selection/selection.browser.test.ts

import { render } from 'vitest-browser-vue'
import CanvasContainer from '~/features/canvas/components/CanvasContainer.vue'
import { API, UI, waitForCanvasReady, waitForPaint } from '~/__test-utils__/browser'
import { assertSelectedElements } from '~/__test-utils__/matchers/assertSelectedElements'
import { reseed, restoreSeed } from '~/__test-utils__/deterministicSeed'

describe('selection', () => {
  beforeEach(() => reseed())
  afterEach(() => restoreSeed())

  it('selects element by clicking on it', async () => {
    const screen = render(CanvasContainer)
    await waitForCanvasReady()
    const ui = new UI(screen)

    const rect = await ui.createElement('rectangle', [2, 2], [5, 5])
    API.clearSelection()
    await waitForPaint()

    // Click on the rectangle center
    await ui.grid.clickCenter([2, 2], [5, 5])

    assertSelectedElements(rect.id)
  })

  it('adds to selection with shift-click', async () => {
    const screen = render(CanvasContainer)
    await waitForCanvasReady()
    const ui = new UI(screen)

    const r1 = await ui.createElement('rectangle', [1, 1], [3, 3])
    const r2 = await ui.createElement('ellipse', [5, 1], [7, 3])
    API.clearSelection()
    await waitForPaint()

    // Click first element
    await ui.grid.clickCenter([1, 1], [3, 3])
    assertSelectedElements(r1.id)

    // Shift-click second element
    await ui.grid.clickCenter([5, 1], [7, 3], { shiftKey: true })
    assertSelectedElements(r1.id, r2.id)
  })

  it('box-selects multiple elements', async () => {
    const screen = render(CanvasContainer)
    await waitForCanvasReady()

    // Inject elements programmatically (fast scene setup)
    const r1 = API.addElement({ x: 100, y: 100, width: 80, height: 80 })
    const r2 = API.addElement({ x: 250, y: 100, width: 80, height: 80 })
    API.h.markStaticDirty()
    await waitForPaint()

    // Drag selection box around both
    const ui = new UI(screen)
    await ui.grid.drag([0, 0], [6, 4])

    assertSelectedElements(r1.id, r2.id)
  })

  it('deselects on empty canvas click', async () => {
    const screen = render(CanvasContainer)
    await waitForCanvasReady()
    const ui = new UI(screen)

    await ui.createElement('rectangle', [2, 2], [4, 4])
    assertSelectedElements(API.elements[0].id)

    // Click on empty space
    await ui.grid.click([10, 8])

    assertSelectedElements()  // nothing selected
  })
})
```

**Key qualities:**
- Reads like a user story, not implementation wiring
- No `vi.mock`, no `fire()` synthetic events, no `withSetup`
- Uses `API.addElement()` for fast scene setup (Excalidraw's API pattern)
- Uses `assertSelectedElements()` for clean assertions (Excalidraw pattern)
- Uses grid coordinates for readability (our invention)
- Uses deterministic seeding for reproducibility (shared pattern)

---

## Side-by-Side: The Same Test in Three Styles

### Excalidraw style (jsdom + mocked canvas)

```typescript
beforeEach(async () => {
  await render(<Excalidraw />)
})

it('shift-click adds to selection', () => {
  const r1 = API.createElement({ type: 'rectangle', x: 0, y: 0, width: 50, height: 50 })
  const r2 = API.createElement({ type: 'rectangle', x: 100, y: 0, width: 50, height: 50 })
  API.setElements([r1, r2])

  mouse.clickAt(25, 25)
  assertSelectedElements([r1.id])

  Keyboard.withModifierKeys({ shift: true }, () => {
    mouse.clickAt(125, 25)
  })
  assertSelectedElements([r1.id, r2.id])
})
```

### Our current style (Node unit test with mocked events)

```typescript
it('shift-click adds to selection', () => {
  using sel = withSetup(() => useSelection(elements))
  // ... 20 lines of mock setup ...
  fire('pointerdown', { offsetX: 25, offsetY: 25 })
  fire('pointerup', { offsetX: 25, offsetY: 25 })
  expect(sel.selectedIds.value.size).toBe(1)

  fire('pointerdown', { offsetX: 125, offsetY: 25, shiftKey: true })
  fire('pointerup', { offsetX: 125, offsetY: 25, shiftKey: true })
  expect(sel.selectedIds.value.size).toBe(2)
})
```

### Our target style (real browser, Excalidraw patterns)

```typescript
it('shift-click adds to selection', async () => {
  render(CanvasContainer)
  await waitForCanvasReady()

  const r1 = API.addElement({ x: 0, y: 0, width: 50, height: 50 })
  const r2 = API.addElement({ x: 100, y: 0, width: 50, height: 50 })
  API.h.markStaticDirty()
  await waitForPaint()

  await pointer.clickAt(25, 25)
  assertSelectedElements(r1.id)

  await pointer.clickAt(125, 25, { shiftKey: true })
  assertSelectedElements(r1.id, r2.id)
})
```

Same confidence as Excalidraw, but with **real** pointer events, **real**
canvas rendering, and **no mocks at all**.

---

## Summary

```
+===================================================================+
|                                                                   |
|  BORROW from Excalidraw:                                          |
|    - window.h test hook for direct state access                   |
|    - API class for programmatic scene setup                       |
|    - Pointer.clickOn / Pointer.select for element targeting       |
|    - Keyboard.withModifierKeys for scoped modifier context        |
|    - assertSelectedElements for clean selection checks            |
|    - assertElements for order + property + selection in one call  |
|    - Float snapshot serializer for precision stability            |
|    - Checkpoint pattern for regression suites                     |
|    - toCloselyEqualPoints for geometry assertions                 |
|    - Deterministic seeding for reproducible snapshots             |
|    - Inverted pyramid: integration tests are the default          |
|                                                                   |
|  KEEP our own:                                                    |
|    - CanvasGrid for human-readable coordinates                    |
|    - canvasDrag/canvasClick commands for iframe bridge            |
|    - Real browser via Vitest + Playwright (no jsdom)              |
|    - Screenshot tests with real pixels                            |
|    - withSetup + using for remaining pure-logic unit tests        |
|    - Flat test philosophy (no shared mutable state)               |
|    - showGridOverlay for visual debugging                         |
|                                                                   |
|  GAIN over Excalidraw:                                            |
|    - Real canvas rendering (they mock it)                         |
|    - Real pixels in screenshots (they can't)                      |
|    - Real browser APIs (they polyfill everything)                 |
|    - No 120-line setupTests.ts of mocks                           |
|    - Vue reactivity (no stale reference problem, no Proxy needed) |
|                                                                   |
+===================================================================+
```
