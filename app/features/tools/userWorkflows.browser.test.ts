import { CanvasPage } from '~/__test-utils__/browser'

describe('user drawing workflows', () => {
  it('draws a rectangle via toolbar keyboard shortcut', async () => {
    const page = await CanvasPage.create()

    // Press '2' to select rectangle tool
    await page.toolbar.select('rectangle')
    await page.toolbar.expectActive('rectangle')

    // Draw the rectangle
    await page.canvas.pointer.drag(100, 100, 300, 250)

    // Tool should reset to selection after drawing
    await page.toolbar.expectActive('selection')
    const rectBtn = page.screen.getByRole('button', { name: 'Rectangle' })
    await expect.element(rectBtn).toHaveAttribute('aria-pressed', 'false')
  })

  // eslint-disable-next-line vitest/expect-expect -- assertion delegated to page.toolbar.expectActive
  it('draws and selects an element by clicking on it', async () => {
    const page = await CanvasPage.create()

    // Draw a rectangle at known position
    await page.toolbar.select('rectangle')
    await page.canvas.pointer.drag(100, 100, 300, 250)

    // Tool resets to selection, element is auto-selected after draw
    await page.toolbar.expectActive('selection')

    // Click on the rectangle to select it (center of the drawn area)
    await page.canvas.pointer.clickAt(200, 175)

    // The selection tool should still be active
    await page.toolbar.expectActive('selection')
  })

  it('switches between tools via keyboard shortcuts', async () => {
    const page = await CanvasPage.create()

    // Start with selection tool
    await page.toolbar.expectActive('selection')

    // Switch to rectangle (2)
    await page.toolbar.select('rectangle')
    await page.toolbar.expectActive('rectangle')
    const selectionBtn = page.screen.getByRole('button', { name: 'Selection' })
    await expect.element(selectionBtn).toHaveAttribute('aria-pressed', 'false')

    // Switch to diamond (3)
    await page.toolbar.select('diamond')
    await page.toolbar.expectActive('diamond')
    const rectBtn = page.screen.getByRole('button', { name: 'Rectangle' })
    await expect.element(rectBtn).toHaveAttribute('aria-pressed', 'false')

    // Switch to ellipse (4)
    await page.toolbar.select('ellipse')
    await page.toolbar.expectActive('ellipse')
    const diamondBtn = page.screen.getByRole('button', { name: 'Diamond' })
    await expect.element(diamondBtn).toHaveAttribute('aria-pressed', 'false')

    // Switch to arrow (a)
    await page.toolbar.select('arrow')
    await page.toolbar.expectActive('arrow')
    const ellipseBtn = page.screen.getByRole('button', { name: 'Ellipse' })
    await expect.element(ellipseBtn).toHaveAttribute('aria-pressed', 'false')

    // Back to selection (1)
    await page.toolbar.select('selection')
    await page.toolbar.expectActive('selection')
    const arrowBtn = page.screen.getByRole('button', { name: /^Arrow$/ })
    await expect.element(arrowBtn).toHaveAttribute('aria-pressed', 'false')
  })

  // eslint-disable-next-line vitest/expect-expect -- assertion delegated to page.toolbar.expectActive
  it('draws multiple shapes in sequence', async () => {
    const page = await CanvasPage.create()

    // Draw a rectangle
    await page.toolbar.select('rectangle')
    await page.canvas.pointer.drag(50, 50, 150, 150)

    // Tool resets to selection — switch to ellipse for second shape
    await page.toolbar.select('ellipse')
    await page.canvas.pointer.drag(200, 200, 350, 300)

    // Tool resets to selection again
    await page.toolbar.expectActive('selection')
  })

  it('draws an arrow between two positions', async () => {
    const page = await CanvasPage.create()

    // Select arrow tool
    await page.toolbar.select('arrow')
    await page.toolbar.expectActive('arrow')

    // Draw the arrow
    await page.canvas.pointer.drag(100, 100, 400, 300)

    // Tool resets to selection
    await page.toolbar.expectActive('selection')
    const arrowBtn = page.screen.getByRole('button', { name: /^Arrow$/ })
    await expect.element(arrowBtn).toHaveAttribute('aria-pressed', 'false')
  })
})
