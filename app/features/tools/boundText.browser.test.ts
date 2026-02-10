import { commands, userEvent } from 'vitest/browser'
import { CanvasPage } from '~/__test-utils__/browser'
import { waitForPaint } from '~/__test-utils__/browser/waiters'

const SEL = '[data-testid="interactive-canvas"]'

describe('bound text on shapes', () => {
  it('double-click on rectangle creates bound text', async () => {
    const cp = await CanvasPage.create()

    // Draw rectangle from (80, 80) to (250, 200)
    await cp.toolbar.select('rectangle')
    await cp.canvas.pointer.drag(80, 80, 250, 200)
    await waitForPaint()

    // Double-click at center of rectangle: (165, 140)
    await cp.toolbar.select('selection')
    await commands.canvasDblClick(SEL, 165, 140)

    // Verify text editor opened
    const textarea = cp.screen.getByRole('textbox')
    await expect.element(textarea).toBeVisible()

    await userEvent.keyboard('{Escape}')
    await expect.poll(() => {
      // eslint-disable-next-line no-restricted-syntax -- need raw DOM check
      return document.querySelector('textarea')
    }).toBeNull()
  })
})
