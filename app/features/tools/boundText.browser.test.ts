import { render } from 'vitest-browser-vue'
import { commands, userEvent } from 'vitest/browser'
import CanvasContainer from '~/features/canvas/components/CanvasContainer.vue'
import { reseed, restoreSeed } from '~/__test-utils__/deterministicSeed'
import { waitForCanvasReady, waitForPaint } from '~/__test-utils__/browser'

const SEL = '[data-testid="interactive-canvas"]'

describe('bound text on shapes', () => {
  beforeEach(() => reseed())
  afterEach(() => restoreSeed())

  it('double-click on rectangle creates bound text', async () => {
    const screen = render(CanvasContainer)
    await waitForCanvasReady()

    // Draw rectangle from (80, 80) to (250, 200)
    await userEvent.keyboard('2')
    await commands.canvasDrag(SEL, 80, 80, 250, 200)
    await waitForPaint()

    // Double-click at center of rectangle: (165, 140)
    await userEvent.keyboard('1')
    await commands.canvasDblClick(SEL, 165, 140)

    // Verify text editor opened
    const textarea = screen.getByRole('textbox')
    await expect.element(textarea).toBeVisible()

    await userEvent.keyboard('{Escape}')
    await expect.poll(() => {
      // eslint-disable-next-line no-restricted-syntax -- need raw DOM check
      return document.querySelector('textarea')
    }).toBeNull()
  })
})
