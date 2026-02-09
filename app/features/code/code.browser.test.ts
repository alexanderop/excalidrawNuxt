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

describe('code tool rendering', () => {
  beforeEach(() => reseed())
  afterEach(() => restoreSeed())

  it('renders a code element with syntax-highlighted TypeScript', async () => {
    const screen = render(CanvasContainer)
    await waitForCanvasReady()

    // Activate code tool with 'c' shortcut
    await userEvent.keyboard('c')
    const codeBtn = screen.getByRole('button', { name: 'Code' })
    await expect.element(codeBtn).toHaveAttribute('aria-pressed', 'true')

    // Click on canvas to create a code element — opens inline editor
    await commands.canvasClick(CANVAS_SELECTOR, 200, 200)

    // Editor should open with a textarea
    const textarea = screen.getByRole('textbox')
    await expect.element(textarea).toBeVisible()

    // Type TypeScript code into the editor
    const code = 'function greet(name: string): string {\n  return `Hello, ${name}!`\n}'
    await userEvent.fill(textarea, code)
    await expect.element(textarea).toHaveValue(code)

    // Submit with Escape to close editor and render on canvas
    await userEvent.keyboard('{Escape}')

    // Wait for editor to close
    await expect.poll(() => {
      // eslint-disable-next-line no-restricted-syntax -- need raw DOM check after element removal
      return document.querySelector('textarea')
    }).toBeNull()

    // Wait for canvas to repaint with the code element
    await waitForPaint()
    // Extra frame for Shiki async highlighting
    await waitForPaint()

    await expect(page.getByTestId('canvas-container')).toMatchScreenshot('code-element-typescript')
  })
})
