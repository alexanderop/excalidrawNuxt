import { render } from 'vitest-browser-vue'
import { page, commands, userEvent } from 'vitest/browser'
import CanvasContainer from '~/features/canvas/components/CanvasContainer.vue'
import { reseed, restoreSeed } from '~/__test-utils__/deterministicSeed'

const CANVAS_SELECTOR = '[data-testid="interactive-canvas"]'

async function waitForCanvasReady(): Promise<void> {
  await expect.poll(() => {
    // eslint-disable-next-line no-restricted-syntax -- need raw DOM access for canvas.width polling
    const canvas = document.querySelector<HTMLCanvasElement>(CANVAS_SELECTOR)
    return canvas?.width ?? 0
  }, { timeout: 5000 }).toBeGreaterThan(0)
  await new Promise<void>(r => requestAnimationFrame(() => r()))
}

async function waitForPaint(): Promise<void> {
  await new Promise<void>(r => requestAnimationFrame(() => r()))
}

describe('text tool interaction', () => {
  beforeEach(() => reseed())
  afterEach(() => restoreSeed())

  it('opens editor on single click with text tool (like Excalidraw)', async () => {
    const screen = render(CanvasContainer)
    await waitForCanvasReady()

    // Press 't' to activate text tool
    await userEvent.keyboard('t')
    const textBtn = screen.getByRole('button', { name: 'Text' })
    await expect.element(textBtn).toHaveAttribute('aria-pressed', 'true')

    // Single click on canvas — editor should open immediately (no double-click needed)
    await commands.canvasClick(CANVAS_SELECTOR, 400, 300)

    // A textarea should now be visible — this is the inline text editor
    const textarea = screen.getByRole('textbox')
    await expect.element(textarea).toBeVisible()

    // Type text into the editor
    await userEvent.fill(textarea, 'Hello World')
    await expect.element(textarea).toHaveValue('Hello World')

    // Submit with Escape
    await userEvent.keyboard('{Escape}')

    // Textarea should be removed after submit
    await expect.poll(() => {
      // eslint-disable-next-line no-restricted-syntax -- need raw DOM check after element removal
      return document.querySelector('textarea')
    }).toBeNull()

    // Text rendered on the canvas
    await waitForPaint()
    await expect(page.getByTestId('canvas-container')).toMatchScreenshot('text-single-click-hello-world')
  })

  it('switches to selection tool after opening text editor', async () => {
    const screen = render(CanvasContainer)
    await waitForCanvasReady()

    // Activate text tool and click canvas
    await userEvent.keyboard('t')
    await commands.canvasClick(CANVAS_SELECTOR, 400, 300)

    // Tool should have switched to selection while editor is open
    const selectionBtn = screen.getByRole('button', { name: 'Selection' })
    await expect.element(selectionBtn).toHaveAttribute('aria-pressed', 'true')
  })

  it('textarea grows in width as user types long text', async () => {
    const screen = render(CanvasContainer)
    await waitForCanvasReady()

    // Activate text tool and click to open editor
    await userEvent.keyboard('t')
    await commands.canvasClick(CANVAS_SELECTOR, 200, 300)

    const textarea = screen.getByRole('textbox')
    await expect.element(textarea).toBeVisible()

    // Type character by character (realistic typing, not fill) to test dynamic resize
    await userEvent.type(textarea, 'hello how are you doing today my friend')

    // 1. The textarea must have grown — its offsetWidth should be much larger than the initial min-width (1ch ≈ 8-10px)
    await expect.poll(() => {
      // eslint-disable-next-line no-restricted-syntax -- need raw DOM access for width measurement
      const ta = document.querySelector('textarea')
      if (!ta) return 0
      return ta.offsetWidth
    }, { timeout: 2000 }).toBeGreaterThan(100)

    // 2. No overflow — scrollWidth must not exceed clientWidth (text is not clipped)
    await expect.poll(() => {
      // eslint-disable-next-line no-restricted-syntax -- need raw DOM access for scroll measurement
      const ta = document.querySelector('textarea')
      if (!ta) return false
      return ta.scrollWidth <= ta.clientWidth
    }).toBe(true)

    // 3. Visual check — screenshot with textarea open should show text fully visible
    await expect(page.getByTestId('canvas-container')).toMatchScreenshot('text-textarea-grows-with-content')
  })

  it('deletes empty text element on submit', async () => {
    const screen = render(CanvasContainer)
    await waitForCanvasReady()

    // Create text editor with single click
    await userEvent.keyboard('t')
    await commands.canvasClick(CANVAS_SELECTOR, 400, 300)

    // Editor opens
    const textarea = screen.getByRole('textbox')
    await expect.element(textarea).toBeVisible()

    // Submit without typing anything — element should be deleted
    await userEvent.keyboard('{Escape}')
    await expect.poll(() => {
      // eslint-disable-next-line no-restricted-syntax -- need raw DOM check after element removal
      return document.querySelector('textarea')
    }).toBeNull()

    // Canvas should be empty (no text element)
    await waitForPaint()
    await expect(page.getByTestId('canvas-container')).toMatchScreenshot('text-empty-deleted')
  })
})
