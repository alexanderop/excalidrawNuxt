import { page as vitestPage } from 'vitest/browser'
import { CanvasPage, waitForPaint } from '~/__test-utils__/browser'

describe('visual rendering', () => {
  // RoughJS uses Math.random for hand-drawn stroke variations.
  // Seed it deterministically so screenshots are pixel-identical across runs.
  // CanvasPage.create() handles reseed() + onTestFinished(() => restoreSeed())

  it('renders empty canvas with grid', async () => {
    await CanvasPage.create()

    await expect(vitestPage.getByTestId('canvas-container')).toMatchScreenshot('empty-canvas-with-grid')
  })

  it('renders a rectangle', async () => {
    const page = await CanvasPage.create()

    await page.toolbar.select('rectangle')
    await page.canvas.pointer.drag(100, 100, 300, 250)
    // Wait one frame for the new-element layer to paint after drag completes
    await waitForPaint()

    await expect(vitestPage.getByTestId('canvas-container')).toMatchScreenshot('single-rectangle')
  })

  it('renders an arrow', async () => {
    const page = await CanvasPage.create()

    await page.toolbar.select('arrow')
    await page.canvas.pointer.drag(100, 200, 350, 150)
    await waitForPaint()

    await expect(vitestPage.getByTestId('canvas-container')).toMatchScreenshot('single-arrow')
  })

  it('renders multiple overlapping elements', async () => {
    const page = await CanvasPage.create()

    // Draw a rectangle
    await page.toolbar.select('rectangle')
    await page.canvas.pointer.drag(50, 50, 250, 200)

    // Draw an ellipse overlapping it
    await page.toolbar.select('ellipse')
    await page.canvas.pointer.drag(150, 100, 350, 280)

    // Draw a diamond overlapping both
    await page.toolbar.select('diamond')
    await page.canvas.pointer.drag(100, 80, 300, 260)
    await waitForPaint()

    await expect(vitestPage.getByTestId('canvas-container')).toMatchScreenshot('multiple-overlapping-elements')
  })

  it('renders selection handles on selected element', async () => {
    const page = await CanvasPage.create()

    // Draw a rectangle — tool resets to selection, element is auto-selected
    await page.toolbar.select('rectangle')
    await page.canvas.pointer.drag(100, 100, 300, 250)
    await waitForPaint()

    // Selection handles should be visible (composited with the drawn shape)
    await expect(vitestPage.getByTestId('canvas-container')).toMatchScreenshot('selection-handles')
  })

  it('renders all element types using grid coordinates', async () => {
    const page = await CanvasPage.create()

    // Row 1: Rectangle at cells [1,1]→[4,3]
    await page.canvas.createElementAtCells('rectangle', [1, 1], [4, 3])

    // Row 1: Diamond at cells [5,1]→[8,3]
    await page.canvas.createElementAtCells('diamond', [5, 1], [8, 3])

    // Row 2: Ellipse at cells [1,4]→[4,6]
    await page.canvas.createElementAtCells('ellipse', [1, 4], [4, 6])

    // Row 2: Arrow at cells [5,5]→[8,5]
    await page.canvas.createElementAtCells('arrow', [5, 5], [8, 5])

    await waitForPaint()

    await expect(vitestPage.getByTestId('canvas-container')).toMatchScreenshot('all-elements-grid')
  })
})
