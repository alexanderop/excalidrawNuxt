import { render } from 'vitest-browser-vue'
import { commands, userEvent } from 'vitest/browser'
import CanvasContainer from '~/features/canvas/components/CanvasContainer.vue'

const CANVAS_SELECTOR = '[data-testid="interactive-canvas"]'

describe('drawing tool resets to selection after use', () => {
  it('switches back to selection after drawing an arrow', async () => {
    const screen = render(CanvasContainer)

    await userEvent.keyboard('a')

    const arrowBtn = screen.getByRole('button', { name: /^Arrow$/ })
    await expect.element(arrowBtn).toHaveAttribute('aria-pressed', 'true')

    // Realistic drag via Playwright's Mouse API (real CDP events)
    await commands.canvasDrag(CANVAS_SELECTOR, 100, 100, 250, 180)

    const selectionBtn = screen.getByRole('button', { name: 'Selection' })
    await expect.element(selectionBtn).toHaveAttribute('aria-pressed', 'true')
    await expect.element(arrowBtn).toHaveAttribute('aria-pressed', 'false')
  })

  it('switches back to selection after drawing a rectangle', async () => {
    const screen = render(CanvasContainer)

    await userEvent.keyboard('r')

    const rectBtn = screen.getByRole('button', { name: 'Rectangle' })
    await expect.element(rectBtn).toHaveAttribute('aria-pressed', 'true')

    await commands.canvasDrag(CANVAS_SELECTOR, 100, 100, 250, 180)

    const selectionBtn = screen.getByRole('button', { name: 'Selection' })
    await expect.element(selectionBtn).toHaveAttribute('aria-pressed', 'true')
    await expect.element(rectBtn).toHaveAttribute('aria-pressed', 'false')
  })
})
