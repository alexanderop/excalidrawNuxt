---
name: screenshot-test
description: Add a screenshot (visual regression) browser test for a canvas feature. Use when asked to "add a screenshot test for X", "visual test for X", "screenshot test X", "add a browser test with screenshots", or when the user wants to verify how something renders on the canvas.
---

# Screenshot Test Generator

Generate visual regression browser tests that verify canvas rendering by simulating real user interactions and comparing screenshots against baselines.

## Core Principles

1. **Test like a user** — every test simulates what a real user would do: select a tool via keyboard shortcut, drag on the canvas to draw, click to select. Never manipulate internal state directly.
2. **Grid coordinates** — use the `CanvasGrid` cell system for readable, maintainable positions instead of raw pixel values. The default grid is 16x9 on a 1280x720 canvas (80x80px cells).
3. **Deterministic rendering** — RoughJS uses `Math.random()` for hand-drawn stroke variations. Every test must seed it deterministically so screenshots are pixel-identical across runs.
4. **Wait for paint** — the canvas render pipeline is async (ResizeObserver -> watch -> RAF -> paint). Always wait for the canvas to be ready, and wait one extra frame after drawing before screenshotting.

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
import { render } from 'vitest-browser-vue'
import { page, commands, userEvent } from 'vitest/browser'
import CanvasContainer from '~/features/canvas/components/CanvasContainer.vue'
import { reseed, restoreSeed } from '~/__test-utils__/deterministicSeed'
import { UI } from '~/__test-utils__/browser'

const CANVAS_SELECTOR = '[data-testid="interactive-canvas"]'

async function waitForCanvasReady(): Promise<void> {
  await expect.poll(() => {
    // eslint-disable-next-line no-restricted-syntax -- need raw DOM access for canvas.width polling
    const canvas = document.querySelector<HTMLCanvasElement>(CANVAS_SELECTOR)
    return canvas?.width ?? 0
  }, { timeout: 5000 }).toBeGreaterThan(0)
  await new Promise<void>(r => requestAnimationFrame(() => r()))
}

/** Wait one frame for newly drawn content to paint. */
async function waitForPaint(): Promise<void> {
  await new Promise<void>(r => requestAnimationFrame(() => r()))
}

describe('{feature name} rendering', () => {
  beforeEach(() => reseed())
  afterEach(() => restoreSeed())

  it('{describes what the user sees}', async () => {
    const screen = render(CanvasContainer)
    await waitForCanvasReady()
    const ui = new UI(screen)

    // Simulate user actions using grid cells
    await ui.createElementAtCells('rectangle', [2, 2], [6, 5])
    await waitForPaint()

    await expect(page.getByTestId('canvas-container')).toMatchScreenshot('{descriptive-name}')
  })
})
```

## Available User Actions

### Drawing elements (via `UI` helper)

```typescript
const ui = new UI(screen)

// Draw using grid cells (preferred — readable and maintainable)
await ui.createElementAtCells('rectangle', [1, 1], [4, 3])
await ui.createElementAtCells('diamond', [5, 1], [8, 3])
await ui.createElementAtCells('ellipse', [1, 4], [4, 6])
await ui.createElementAtCells('arrow', [5, 5], [8, 5])

// Draw using raw pixel coords (only when precise positioning matters)
await ui.createElement('rectangle', 100, 100, 300, 250)
```

### Tool selection (keyboard shortcuts)

```typescript
await userEvent.keyboard('1')  // Selection tool
await userEvent.keyboard('2')  // Rectangle
await userEvent.keyboard('3')  // Diamond
await userEvent.keyboard('4')  // Ellipse
await userEvent.keyboard('a')  // Arrow

// Or via UI helper
await ui.clickTool('rectangle')
```

### Clicking and dragging on canvas

```typescript
// Grid-based (preferred)
await ui.grid.click([3, 3])
await ui.grid.click([3, 3], { shiftKey: true })  // with modifier
await ui.grid.drag([1, 1], [4, 4])

// Raw commands (when needed)
await commands.canvasClick(CANVAS_SELECTOR, 200, 150)
await commands.canvasDrag(CANVAS_SELECTOR, 100, 100, 300, 250)
```

### Keyboard input

```typescript
await ui.keyboard.press('Delete')
await ui.keyboard.press('{Meta>}g{/Meta}')  // Cmd+G
```

### Tool state assertions

```typescript
await ui.expectToolActive('selection')  // checks aria-pressed="true"
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
await ui.createElementAtCells('rectangle', [1, 1], [4, 3])  // left shape
await ui.createElementAtCells('diamond', [5, 1], [8, 3])    // right shape
```

### Debug overlay

When debugging, inject a visible grid:

```typescript
await ui.grid.showOverlay(10000) // shows red grid lines for 10 seconds
```

## Critical Rules

1. **Always `reseed()` / `restoreSeed()`** in beforeEach/afterEach — without this, RoughJS randomness makes screenshots flaky.
2. **Always `waitForCanvasReady()`** after `render(CanvasContainer)` — the canvas needs time to bootstrap.
3. **Always `waitForPaint()`** (one RAF) after drawing before taking a screenshot — the render pipeline is async.
4. **Never use `page.mouse`** — iframe coordinate translation causes silent mismatches. Use `commands.canvasDrag` / `commands.canvasClick` which dispatch PointerEvents directly inside the iframe.
5. **Screenshot the container** (`page.getByTestId('canvas-container')`), not the canvas element — this includes the toolbar for full context.
6. **Use descriptive kebab-case names** for `toMatchScreenshot('name')` — the name becomes part of the baseline filename.
7. **Test names describe what the user sees** — "renders grouped elements with selection outline", not "tests group rendering function".

## Running Screenshot Tests

```bash
bun test:browser                           # run all browser tests
bun test:browser -- {feature}.browser      # run specific test file
```

On first run, baseline screenshots are created in `__screenshots__/`. On subsequent runs, new screenshots are compared against baselines. To update baselines after intentional visual changes:

```bash
bun test:browser -- --update              # update all baselines
```

## Example: Complete Test for a New Feature

If asked to "add a screenshot test for grouping", produce something like:

```typescript
import { render } from 'vitest-browser-vue'
import { page, userEvent } from 'vitest/browser'
import CanvasContainer from '~/features/canvas/components/CanvasContainer.vue'
import { reseed, restoreSeed } from '~/__test-utils__/deterministicSeed'
import { UI } from '~/__test-utils__/browser'

async function waitForCanvasReady(): Promise<void> {
  await expect.poll(() => {
    // eslint-disable-next-line no-restricted-syntax -- need raw DOM access for canvas.width polling
    const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="interactive-canvas"]')
    return canvas?.width ?? 0
  }, { timeout: 5000 }).toBeGreaterThan(0)
  await new Promise<void>(r => requestAnimationFrame(() => r()))
}

async function waitForPaint(): Promise<void> {
  await new Promise<void>(r => requestAnimationFrame(() => r()))
}

describe('grouping rendering', () => {
  beforeEach(() => reseed())
  afterEach(() => restoreSeed())

  it('renders two grouped elements with shared selection outline', async () => {
    const screen = render(CanvasContainer)
    await waitForCanvasReady()
    const ui = new UI(screen)

    // User draws two shapes
    await ui.createElementAtCells('rectangle', [2, 2], [5, 4])
    await ui.createElementAtCells('ellipse', [6, 2], [9, 4])

    // User selects both (click first, shift-click second)
    await ui.grid.clickCenter([2, 2], [5, 4])
    await ui.grid.clickCenter([6, 2], [9, 4], { shiftKey: true })

    // User groups them with Cmd+G
    await ui.keyboard.press('{Meta>}g{/Meta}')
    await waitForPaint()

    await expect(page.getByTestId('canvas-container')).toMatchScreenshot('grouped-elements-selected')
  })
})
```

Notice how the test reads like a user story: draw two shapes, select both, group them, verify the visual result.
