import { onTestFinished } from 'vitest'
import { page as vitestPage, userEvent } from 'vitest/browser'
import { CanvasPage, waitForPaint } from '~/__test-utils__/browser'

/** Toggle dark mode via Alt+Shift+D and wait for re-render. */
async function toggleDarkMode(): Promise<void> {
  await userEvent.keyboard('{Alt>}{Shift>}d{/Shift}{/Alt}')
  // Theme toggle triggers markAllDirty → RAF paint cycle
  await waitForPaint()
  await waitForPaint()
}

function cleanupDarkMode(): void {
  document.documentElement.classList.remove('theme--dark')
  localStorage.removeItem('excalidraw-theme')
}

describe('dark mode rendering', () => {
  // CanvasPage.create() handles reseed() + onTestFinished(() => restoreSeed())

  it('renders empty canvas in dark mode', async () => {
    await CanvasPage.create()
    onTestFinished(() => cleanupDarkMode())

    await toggleDarkMode()

    await expect(vitestPage.getByTestId('canvas-container')).toMatchScreenshot('dark-empty-canvas')
  })

  it('renders a rectangle in dark mode', async () => {
    const page = await CanvasPage.create()
    onTestFinished(() => cleanupDarkMode())

    await page.canvas.createElementAtCells('rectangle', [2, 2], [6, 5])
    await waitForPaint()

    await toggleDarkMode()

    await expect(vitestPage.getByTestId('canvas-container')).toMatchScreenshot('dark-rectangle')
  })

  it('renders all element types in dark mode', async () => {
    const page = await CanvasPage.create()
    onTestFinished(() => cleanupDarkMode())

    // Row 1: Rectangle and Diamond
    await page.canvas.createElementAtCells('rectangle', [1, 1], [4, 3])
    await page.canvas.createElementAtCells('diamond', [5, 1], [8, 3])

    // Row 2: Ellipse and Arrow
    await page.canvas.createElementAtCells('ellipse', [1, 4], [4, 6])
    await page.canvas.createElementAtCells('arrow', [5, 5], [8, 5])
    await waitForPaint()

    await toggleDarkMode()

    await expect(vitestPage.getByTestId('canvas-container')).toMatchScreenshot('dark-all-elements')
  })

  it('renders selection handles in dark mode', async () => {
    const page = await CanvasPage.create()
    onTestFinished(() => cleanupDarkMode())

    // Draw a rectangle — auto-selected after drawing
    await page.canvas.createElementAtCells('rectangle', [3, 2], [7, 5])
    await waitForPaint()

    await toggleDarkMode()

    // Element stays selected, handles should be visible with dark theme colors
    await expect(vitestPage.getByTestId('canvas-container')).toMatchScreenshot('dark-selection-handles')
  })

  it('toggles from dark back to light mode', async () => {
    const page = await CanvasPage.create()
    onTestFinished(() => cleanupDarkMode())

    await page.canvas.createElementAtCells('rectangle', [2, 2], [6, 5])
    await waitForPaint()

    // Go dark
    await toggleDarkMode()
    // Go back to light
    await toggleDarkMode()

    await expect(vitestPage.getByTestId('canvas-container')).toMatchScreenshot('light-after-toggle')
  })
})
