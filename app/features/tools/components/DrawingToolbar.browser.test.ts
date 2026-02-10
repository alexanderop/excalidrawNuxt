/* eslint-disable vitest/expect-expect -- page object methods wrap expect() */
import { CanvasPage } from '~/__test-utils__/browser'

describe('DrawingToolbar numeric shortcuts', () => {
  it('pressing 1 activates the selection tool', async () => {
    const page = await CanvasPage.create()

    await page.toolbar.select('selection')

    await page.toolbar.expectActive('selection')
  })

  it('pressing 2 activates the rectangle tool', async () => {
    const page = await CanvasPage.create()

    await page.toolbar.select('rectangle')

    await page.toolbar.expectActive('rectangle')
  })

  it('pressing 3 activates the diamond tool', async () => {
    const page = await CanvasPage.create()

    await page.toolbar.select('diamond')

    await page.toolbar.expectActive('diamond')
  })

  it('pressing 4 activates the ellipse tool', async () => {
    const page = await CanvasPage.create()

    await page.toolbar.select('ellipse')

    await page.toolbar.expectActive('ellipse')
  })
})
