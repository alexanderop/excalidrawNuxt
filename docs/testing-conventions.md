# Testing Conventions

## Philosophy

Two core principles:

1. **Flat tests** — each `it()` is self-contained with no shared mutable state via `beforeEach`/`afterEach` hooks (Kent C. Dodds, "Avoid Nesting When You're Testing")
2. **Disposable objects** — `using` keyword + `Symbol.dispose` guarantees cleanup even when assertions throw (Artem Zakharchenko, "`using` in tests")

## Vitest Configuration

Three config files form a workspace:

| File | Purpose | Environment |
|------|---------|-------------|
| `vitest.config.ts` | Workspace root — lists projects | N/A |
| `vitest.config.unit.ts` | Unit tests (`*.unit.test.ts`) | `node` |
| `vitest.config.browser.ts` | Browser tests (`*.browser.test.ts`) | Playwright (chromium) |

Key settings in **unit config**: `globals: true`, `environment: 'node'`, alias `~` → `app/`.

Key settings in **browser config**: `@vitejs/plugin-vue` + `@tailwindcss/vite` plugins, `setupFiles: ['app/__test-utils__/setup-browser.ts']`, custom `canvasDrag` command registered via `browser.commands`.

## `withSetup` API

```ts
import { withSetup } from '~/__test-utils__/withSetup'

// Returns T & Disposable — use with `using` for automatic cleanup
using vp = withSetup(() => useViewport())
expect(vp.scrollX.value).toBe(0)
// scope.stop() called automatically at block exit, even on throw
```

**Signature**: `withSetup<T extends object>(composable: () => T): T & Disposable`

- Wraps the composable in a Vue `effectScope`
- Returns the composable result merged with `Symbol.dispose` for automatic scope cleanup
- TypeScript 5.2+ with `lib: ["ESNext"]` required for `using`/`Disposable`

## Test Factories (`app/__test-utils__/factories/`)

| Factory | File | Creates |
|---------|------|---------|
| `createTestElement(overrides?)` | `element.ts` | `ExcalidrawRectangleElement` (default), `ExcalidrawEllipseElement`, or `ExcalidrawDiamondElement` via `type` override |
| `createTestArrowElement(overrides?)` | `element.ts` | `ExcalidrawArrowElement` with default 2-point arrow, arrowheads, and null bindings |
| `createTestPoint(overrides?)` | `point.ts` | `Point` defaulting to `{ x: 0, y: 0 }` |
| `createViewport(overrides?)` | `viewport.ts` | `Viewport` defaulting to `{ scrollX: 0, scrollY: 0, zoom: 1 }` |

All factories accept a `Partial<T>` override object and spread it over sensible defaults.

## Event Handler Mock Pattern

Composable tests that use `useEventListener` from VueUse share a common mocking pattern:

```ts
type EventHandler = (...args: unknown[]) => void
const eventHandlers = new Map<string, EventHandler[]>()

vi.mock('@vueuse/core', () => ({
  useEventListener: (_target: unknown, event: string, handler: EventHandler) => {
    const handlers = eventHandlers.get(event) ?? []
    handlers.push(handler)
    eventHandlers.set(event, handlers)
  },
}))

function fire(type: string, overrides: Record<string, unknown> = {}) {
  const handlers = eventHandlers.get(type)
  if (!handlers?.length) throw new Error(`No handler for ${type}`)
  const e = { offsetX: 0, offsetY: 0, pointerId: 1, button: 0, shiftKey: false, preventDefault: vi.fn(), ...overrides }
  for (const handler of handlers) handler(e)
}
```

Used in: `useLinearEditor`, `useMultiPointCreation`, `useDrawingInteraction`, `arrowTool`.

Requires `beforeEach(() => { eventHandlers.clear() })` with eslint-disable comment: `// eslint-disable-next-line vitest/no-hooks -- clearing shared event handler map between tests`.

### SSR Guard Stub

Composables that check `typeof document !== 'undefined'` need a global stub in unit tests:

```ts
vi.stubGlobal('document', {})
```

### Canvas Element Stub

Tests that need an `HTMLCanvasElement` use a minimal stub:

```ts
function createCanvasStub(): HTMLCanvasElement {
  return {
    setPointerCapture: vi.fn(),
    releasePointerCapture: vi.fn(),
  } as unknown as HTMLCanvasElement
}
```

## When `describe` is OK

Use `describe` for **output organization only** — grouping related tests under a label. Never use it to share mutable state.

```ts
// GOOD: describe for grouping, no shared state
describe('panBy', () => {
  it('adjusts scroll by dx and dy', () => {
    using vp = withSetup(() => useViewport())
    vp.panBy(100, 50)
    expect(vp.scrollX.value).toBe(100)
  })
})
```

## When hooks are OK

| Hook | Unit tests (`*.unit.test.ts`) | Browser tests (`*.browser.test.ts`) |
|------|-------------------------------|-------------------------------------|
| `beforeEach` / `afterEach` | Warn (ESLint `vitest/no-hooks`) | Allowed |
| `beforeAll` / `afterAll` | Allowed (one-time expensive setup) | Allowed |

When a unit test needs `beforeEach` (e.g. clearing an event handler map or resetting RAF mocks), add the eslint-disable comment with a reason:

```ts
// eslint-disable-next-line vitest/no-hooks -- clearing shared event handler map between tests
beforeEach(() => { eventHandlers.clear() })
```

## Pure function tests

For stateless pure functions (no composable, no reactive state), just call the function directly — no `withSetup` or `using` needed:

```ts
it('clamps value to range', () => {
  expect(clamp(15, 0, 10)).toBe(10)
})
```

For tests that need cache/state reset (e.g. `shapeGenerator`), call the reset function inline at the start of each test:

```ts
it('generates a drawable for a rectangle', () => {
  clearShapeCache()
  const drawable = generateShape(createTestElement({ type: 'rectangle' }), 'light')
  expect(drawable.shape).toBe('rectangle')
})
```

Note: `generateShape` requires a `theme` parameter (`'light'` or `'dark'`).

## Browser Test Conventions

Browser tests use Vitest browser mode with Playwright. Key imports:

```ts
import { render } from 'vitest-browser-vue'
import { commands, userEvent } from '@vitest/browser/context'
```

### Rendering

Use `render()` from `vitest-browser-vue` to mount components:

```ts
const screen = render(CanvasContainer)
```

### User Interaction

- **Keyboard**: `await userEvent.keyboard('r')` (triggers key press)
- **Canvas drags**: `await commands.canvasDrag(CANVAS_SELECTOR, startX, startY, endX, endY)` (dispatches PointerEvents inside iframe — never use `page.mouse`)
- **Assertions**: `await expect.element(btn).toHaveAttribute('aria-pressed', 'true')`

### Common Constants

```ts
const CANVAS_SELECTOR = '[data-testid="interactive-canvas"]'
```

### Screenshot Tests

Screenshot tests using `toMatchScreenshot()` require two setup steps to avoid blank white images:

#### 1. Container Sizing

`vitest-browser-vue` renders components into a bare `<div>` under `<body>` — there's no `#__nuxt` wrapper. Components using `h-full`/`w-full` (height: 100%) need every ancestor to have explicit height. Without this, `useElementSize` returns 0/0 and the renderer never paints.

The browser setup file (`app/__test-utils__/setup-browser.ts`) adds:

```ts
const style = document.createElement('style')
style.textContent = 'body > div { height: 100%; width: 100%; }'
document.head.appendChild(style)
```

#### 2. Wait for Render Pipeline

The canvas rendering pipeline is async: `ResizeObserver → useElementSize ref update → watch → markAllDirty → scheduleRender → RAF → bootstrapCanvas + paint`. Poll until the canvas has non-zero dimensions:

```ts
async function waitForCanvasReady(): Promise<void> {
  await expect.poll(() => {
    const canvas = document.querySelector(CANVAS_SELECTOR) as HTMLCanvasElement | null
    return canvas?.width ?? 0
  }, { timeout: 5000 }).toBeGreaterThan(0)
  await new Promise<void>(r => requestAnimationFrame(() => r()))
}
```

#### 3. Deterministic RoughJS Rendering

RoughJS uses `Math.random()` for hand-drawn stroke variations. Seed it deterministically so screenshots are pixel-identical across runs:

```ts
import { reseed, restoreSeed } from '~/__test-utils__/deterministicSeed'

describe('visual rendering', () => {
  beforeEach(() => reseed())
  afterEach(() => restoreSeed())

  it('renders a shape', async () => {
    render(CanvasContainer)
    await waitForCanvasReady()
    // ... draw shapes ...
    await expect(page.getByTestId('canvas-container')).toMatchScreenshot('shape-name')
  })
})
```

Reference screenshots are stored in `__screenshots__/` next to the test file.

## Canvas Grid Testing

Use `CanvasGrid` to express canvas interactions in human-readable cell coordinates instead of raw pixels.

Default grid: **16 cols x 9 rows** = 80px cells on 1280x720 canvas (16:9 aspect ratio).

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
import { UI } from '~/__test-utils__/browser'

const screen = render(CanvasContainer)
const ui = new UI(screen)

// Draw rectangle from cell [2,2] to cell [5,5]
await ui.createElementAtCells('rectangle', [2, 2], [5, 5])

// Click at a specific cell
await ui.grid.click([3, 3])

// Drag between cells
await ui.grid.drag([1, 1], [4, 4])

// Click center of a region
await ui.grid.clickCenter([2, 2], [5, 5])
```

### Standalone grid (without UI)

```ts
import { CanvasGrid } from '~/__test-utils__/browser'

const grid = new CanvasGrid()
await grid.drag([1, 1], [3, 3])
await grid.click([2, 2])
```

### Custom grid dimensions

```ts
const grid = new CanvasGrid({ cols: 10, rows: 10 })
```

### Visual debugging

Show a red semi-transparent grid overlay with cell labels for debugging:

```ts
await ui.grid.showOverlay()       // auto-removes after 5s
await ui.grid.showOverlay(10000)  // custom duration (ms)
```

### Migration examples

| Before (raw pixels) | After (grid cells) |
|---------------------|---------------------|
| `commands.canvasDrag(SEL, 100, 100, 300, 250)` | `grid.drag([1, 1], [3, 3])` |
| `commands.canvasClick(SEL, 200, 200)` | `grid.click([2, 2])` |
| `ui.createElement('rectangle', 100, 100, 300, 250)` | `ui.createElementAtCells('rectangle', [1, 1], [3, 3])` |

### Coordinate math

`toPixels([col, row])` → `((col + 0.5) * cellWidth, (row + 0.5) * cellHeight)` — the center of the cell. Fractional cells work naturally: `[2.5, 3.5]` targets the boundary between cells.

## ESLint Enforcement

The `app/vitest-unit-flat-tests` config warns on `beforeEach`/`afterEach` in `*.unit.test.ts` files. Browser tests are unaffected. Severity is `warn` to allow escape hatches.

### Common eslint-disable patterns in tests

| Rule | Reason | Example |
|------|--------|---------|
| `vitest/no-hooks` | Shared mock state reset | Event handler map clearing, RAF mock setup |
| `vitest/no-conditional-in-test` | Type narrowing after `createElement` | `if (el.type !== 'arrow') throw` |
