import { render } from 'vitest-browser-vue'
import { page, commands, userEvent } from 'vitest/browser'
import CanvasContainer from '~/features/canvas/components/CanvasContainer.vue'
import { reseed, restoreSeed } from '~/__test-utils__/deterministicSeed'
import { UI } from '~/__test-utils__/browser'

const CANVAS_SELECTOR = '[data-testid="interactive-canvas"]'

/**
 * Wait for the canvas rendering pipeline to complete.
 * The pipeline is: ResizeObserver → useElementSize ref update → watch →
 * markAllDirty → scheduleRender → RAF → bootstrapCanvas + paint callbacks.
 * We poll until bootstrapCanvas has set canvas.width > 0, then wait one
 * extra frame so all three layers have finished painting.
 */
async function waitForCanvasReady(): Promise<void> {
  await expect.poll(() => {
    // eslint-disable-next-line no-restricted-syntax -- need raw DOM access for canvas.width polling
    const canvas = document.querySelector<HTMLCanvasElement>(CANVAS_SELECTOR)
    return canvas?.width ?? 0
  }, { timeout: 5000 }).toBeGreaterThan(0)
  // Extra frame to ensure all dirty layers have painted
  await new Promise<void>(r => requestAnimationFrame(() => r()))
}

describe('visual rendering', () => {
  // RoughJS uses Math.random for hand-drawn stroke variations.
  // Seed it deterministically so screenshots are pixel-identical across runs.
   
  beforeEach(() => reseed())
   
  afterEach(() => restoreSeed())

  it('renders empty canvas with grid', async () => {
    render(CanvasContainer)
    await waitForCanvasReady()

    await expect(page.getByTestId('canvas-container')).toMatchScreenshot('empty-canvas-with-grid')
  })

  it('renders a rectangle', async () => {
    render(CanvasContainer)
    await waitForCanvasReady()

    await userEvent.keyboard('2')
    await commands.canvasDrag(CANVAS_SELECTOR, 100, 100, 300, 250)
    // Wait one frame for the new-element layer to paint after drag completes
    await new Promise<void>(r => requestAnimationFrame(() => r()))

    await expect(page.getByTestId('canvas-container')).toMatchScreenshot('single-rectangle')
  })

  it('renders an arrow', async () => {
    render(CanvasContainer)
    await waitForCanvasReady()

    await userEvent.keyboard('a')
    await commands.canvasDrag(CANVAS_SELECTOR, 100, 200, 350, 150)
    await new Promise<void>(r => requestAnimationFrame(() => r()))

    await expect(page.getByTestId('canvas-container')).toMatchScreenshot('single-arrow')
  })

  it('renders multiple overlapping elements', async () => {
    render(CanvasContainer)
    await waitForCanvasReady()

    // Draw a rectangle
    await userEvent.keyboard('2')
    await commands.canvasDrag(CANVAS_SELECTOR, 50, 50, 250, 200)

    // Draw an ellipse overlapping it
    await userEvent.keyboard('4')
    await commands.canvasDrag(CANVAS_SELECTOR, 150, 100, 350, 280)

    // Draw a diamond overlapping both
    await userEvent.keyboard('3')
    await commands.canvasDrag(CANVAS_SELECTOR, 100, 80, 300, 260)
    await new Promise<void>(r => requestAnimationFrame(() => r()))

    await expect(page.getByTestId('canvas-container')).toMatchScreenshot('multiple-overlapping-elements')
  })

  it('renders selection handles on selected element', async () => {
    render(CanvasContainer)
    await waitForCanvasReady()

    // Draw a rectangle — tool resets to selection, element is auto-selected
    await userEvent.keyboard('2')
    await commands.canvasDrag(CANVAS_SELECTOR, 100, 100, 300, 250)
    await new Promise<void>(r => requestAnimationFrame(() => r()))

    // Selection handles should be visible (composited with the drawn shape)
    await expect(page.getByTestId('canvas-container')).toMatchScreenshot('selection-handles')
  })

  it('renders all element types using grid coordinates', async () => {
    const screen = render(CanvasContainer)
    await waitForCanvasReady()
    const ui = new UI(screen)

    // Row 1: Rectangle at cells [1,1]→[4,3]
    await ui.createElementAtCells('rectangle', [1, 1], [4, 3])

    // Row 1: Diamond at cells [5,1]→[8,3]
    await ui.createElementAtCells('diamond', [5, 1], [8, 3])

    // Row 2: Ellipse at cells [1,4]→[4,6]
    await ui.createElementAtCells('ellipse', [1, 4], [4, 6])

    // Row 2: Arrow at cells [5,5]→[8,5]
    await ui.createElementAtCells('arrow', [5, 5], [8, 5])

    await new Promise<void>(r => requestAnimationFrame(() => r()))

    await expect(page.getByTestId('canvas-container')).toMatchScreenshot('all-elements-grid')
  })
})
