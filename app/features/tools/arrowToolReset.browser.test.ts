import { CanvasPage } from '~/__test-utils__/browser'

describe('drawing tool resets to selection after use', () => {
  it('switches back to selection after drawing an arrow', async () => {
    const page = await CanvasPage.create()

    await page.toolbar.select('arrow')

    const arrowBtn = page.screen.getByRole('button', { name: /^Arrow$/ })
    await expect.element(arrowBtn).toHaveAttribute('aria-pressed', 'true')

    // Realistic drag via pointer (real CDP events)
    await page.canvas.pointer.drag(100, 100, 250, 180)

    await page.toolbar.expectActive('selection')
    await expect.element(arrowBtn).toHaveAttribute('aria-pressed', 'false')
  })

  it('switches back to selection after drawing a rectangle', async () => {
    const page = await CanvasPage.create()

    await page.toolbar.select('rectangle')

    const rectBtn = page.screen.getByRole('button', { name: 'Rectangle' })
    await expect.element(rectBtn).toHaveAttribute('aria-pressed', 'true')

    await page.canvas.pointer.drag(100, 100, 250, 180)

    await page.toolbar.expectActive('selection')
    await expect.element(rectBtn).toHaveAttribute('aria-pressed', 'false')
  })
})
