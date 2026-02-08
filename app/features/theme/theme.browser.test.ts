import { render } from 'vitest-browser-vue'
import { page, userEvent } from 'vitest/browser'
import CanvasContainer from '~/features/canvas/components/CanvasContainer.vue'
import { reseed, restoreSeed } from '~/__test-utils__/deterministicSeed'
import { UI } from '~/__test-utils__/browser'

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

/** Toggle dark mode via Alt+Shift+D and wait for re-render. */
async function toggleDarkMode(): Promise<void> {
  await userEvent.keyboard('{Alt>}{Shift>}d{/Shift}{/Alt}')
  // Theme toggle triggers markAllDirty → RAF paint cycle
  await waitForPaint()
  await waitForPaint()
}

describe('dark mode rendering', () => {
  beforeEach(() => reseed())
  afterEach(() => {
    restoreSeed()
    // Reset theme to light so it doesn't leak between tests
    document.documentElement.classList.remove('theme--dark')
    localStorage.removeItem('excalidraw-theme')
  })

  it('renders empty canvas in dark mode', async () => {
    render(CanvasContainer)
    await waitForCanvasReady()

    await toggleDarkMode()

    await expect(page.getByTestId('canvas-container')).toMatchScreenshot('dark-empty-canvas')
  })

  it('renders a rectangle in dark mode', async () => {
    const screen = render(CanvasContainer)
    await waitForCanvasReady()
    const ui = new UI(screen)

    await ui.createElementAtCells('rectangle', [2, 2], [6, 5])
    await waitForPaint()

    await toggleDarkMode()

    await expect(page.getByTestId('canvas-container')).toMatchScreenshot('dark-rectangle')
  })

  it('renders all element types in dark mode', async () => {
    const screen = render(CanvasContainer)
    await waitForCanvasReady()
    const ui = new UI(screen)

    // Row 1: Rectangle and Diamond
    await ui.createElementAtCells('rectangle', [1, 1], [4, 3])
    await ui.createElementAtCells('diamond', [5, 1], [8, 3])

    // Row 2: Ellipse and Arrow
    await ui.createElementAtCells('ellipse', [1, 4], [4, 6])
    await ui.createElementAtCells('arrow', [5, 5], [8, 5])
    await waitForPaint()

    await toggleDarkMode()

    await expect(page.getByTestId('canvas-container')).toMatchScreenshot('dark-all-elements')
  })

  it('renders selection handles in dark mode', async () => {
    const screen = render(CanvasContainer)
    await waitForCanvasReady()
    const ui = new UI(screen)

    // Draw a rectangle — auto-selected after drawing
    await ui.createElementAtCells('rectangle', [3, 2], [7, 5])
    await waitForPaint()

    await toggleDarkMode()

    // Element stays selected, handles should be visible with dark theme colors
    await expect(page.getByTestId('canvas-container')).toMatchScreenshot('dark-selection-handles')
  })

  it('toggles from dark back to light mode', async () => {
    const screen = render(CanvasContainer)
    await waitForCanvasReady()
    const ui = new UI(screen)

    await ui.createElementAtCells('rectangle', [2, 2], [6, 5])
    await waitForPaint()

    // Go dark
    await toggleDarkMode()
    // Go back to light
    await toggleDarkMode()

    await expect(page.getByTestId('canvas-container')).toMatchScreenshot('light-after-toggle')
  })
})
