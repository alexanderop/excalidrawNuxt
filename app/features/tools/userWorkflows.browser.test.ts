import { render } from 'vitest-browser-vue'
import { commands, userEvent } from 'vitest/browser'
import CanvasContainer from '~/features/canvas/components/CanvasContainer.vue'

const CANVAS_SELECTOR = '[data-testid="interactive-canvas"]'

describe('user drawing workflows', () => {
  it('draws a rectangle via toolbar keyboard shortcut', async () => {
    const screen = render(CanvasContainer)

    // Press '2' to select rectangle tool
    await userEvent.keyboard('2')
    const rectBtn = screen.getByRole('button', { name: 'Rectangle' })
    await expect.element(rectBtn).toHaveAttribute('aria-pressed', 'true')

    // Draw the rectangle
    await commands.canvasDrag(CANVAS_SELECTOR, 100, 100, 300, 250)

    // Tool should reset to selection after drawing
    const selectionBtn = screen.getByRole('button', { name: 'Selection' })
    await expect.element(selectionBtn).toHaveAttribute('aria-pressed', 'true')
    await expect.element(rectBtn).toHaveAttribute('aria-pressed', 'false')
  })

  it('draws and selects an element by clicking on it', async () => {
    const screen = render(CanvasContainer)

    // Draw a rectangle at known position
    await userEvent.keyboard('2')
    await commands.canvasDrag(CANVAS_SELECTOR, 100, 100, 300, 250)

    // Tool resets to selection, element is auto-selected after draw
    const selectionBtn = screen.getByRole('button', { name: 'Selection' })
    await expect.element(selectionBtn).toHaveAttribute('aria-pressed', 'true')

    // Click on the rectangle to select it (center of the drawn area)
    await commands.canvasClick(CANVAS_SELECTOR, 200, 175)

    // The selection tool should still be active
    await expect.element(selectionBtn).toHaveAttribute('aria-pressed', 'true')
  })

  it('switches between tools via keyboard shortcuts', async () => {
    const screen = render(CanvasContainer)

    // Start with selection tool
    const selectionBtn = screen.getByRole('button', { name: 'Selection' })
    await expect.element(selectionBtn).toHaveAttribute('aria-pressed', 'true')

    // Switch to rectangle (2)
    await userEvent.keyboard('2')
    const rectBtn = screen.getByRole('button', { name: 'Rectangle' })
    await expect.element(rectBtn).toHaveAttribute('aria-pressed', 'true')
    await expect.element(selectionBtn).toHaveAttribute('aria-pressed', 'false')

    // Switch to diamond (3)
    await userEvent.keyboard('3')
    const diamondBtn = screen.getByRole('button', { name: 'Diamond' })
    await expect.element(diamondBtn).toHaveAttribute('aria-pressed', 'true')
    await expect.element(rectBtn).toHaveAttribute('aria-pressed', 'false')

    // Switch to ellipse (4)
    await userEvent.keyboard('4')
    const ellipseBtn = screen.getByRole('button', { name: 'Ellipse' })
    await expect.element(ellipseBtn).toHaveAttribute('aria-pressed', 'true')
    await expect.element(diamondBtn).toHaveAttribute('aria-pressed', 'false')

    // Switch to arrow (a)
    await userEvent.keyboard('a')
    const arrowBtn = screen.getByRole('button', { name: 'Arrow' })
    await expect.element(arrowBtn).toHaveAttribute('aria-pressed', 'true')
    await expect.element(ellipseBtn).toHaveAttribute('aria-pressed', 'false')

    // Back to selection (1)
    await userEvent.keyboard('1')
    await expect.element(selectionBtn).toHaveAttribute('aria-pressed', 'true')
    await expect.element(arrowBtn).toHaveAttribute('aria-pressed', 'false')
  })

  it('draws multiple shapes in sequence', async () => {
    const screen = render(CanvasContainer)

    // Draw a rectangle
    await userEvent.keyboard('2')
    await commands.canvasDrag(CANVAS_SELECTOR, 50, 50, 150, 150)

    // Tool resets to selection — switch to ellipse for second shape
    await userEvent.keyboard('4')
    await commands.canvasDrag(CANVAS_SELECTOR, 200, 200, 350, 300)

    // Tool resets to selection again
    const selectionBtn = screen.getByRole('button', { name: 'Selection' })
    await expect.element(selectionBtn).toHaveAttribute('aria-pressed', 'true')
  })

  it('draws an arrow between two positions', async () => {
    const screen = render(CanvasContainer)

    // Select arrow tool
    await userEvent.keyboard('a')
    const arrowBtn = screen.getByRole('button', { name: 'Arrow' })
    await expect.element(arrowBtn).toHaveAttribute('aria-pressed', 'true')

    // Draw the arrow
    await commands.canvasDrag(CANVAS_SELECTOR, 100, 100, 400, 300)

    // Tool resets to selection
    const selectionBtn = screen.getByRole('button', { name: 'Selection' })
    await expect.element(selectionBtn).toHaveAttribute('aria-pressed', 'true')
    await expect.element(arrowBtn).toHaveAttribute('aria-pressed', 'false')
  })
})
