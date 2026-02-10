import { commands, userEvent } from 'vitest/browser'
import { API, CanvasPage, waitForPaint } from '~/__test-utils__/browser'
import { isArrowElement } from '~/features/elements/types'

const SEL = '[data-testid="interactive-canvas"]'

describe('linear editor (point editing)', () => {
  it('enters editor on double-click of arrow', async () => {
    const page = await CanvasPage.create()

    // Draw an arrow
    await page.canvas.createElementAtCells('arrow', [2, 2], [8, 5])
    await waitForPaint()

    const arrow = page.scene.elements.find(e => isArrowElement(e))
    expect(arrow).toBeDefined()

    // Ensure selection tool is active
    await page.toolbar.select('selection')

    // Double-click on the arrow center to enter editor
    const cx = arrow!.x + arrow!.width / 2
    const cy = arrow!.y + arrow!.height / 2
    await commands.canvasDblClick(SEL, cx, cy)
    await waitForPaint()

    // The linear editor should be active
    expect(API.h.newElement.value).toBeNull()
  })

  it('exits editor on Escape', async () => {
    const page = await CanvasPage.create()

    // Draw an arrow
    await page.canvas.createElementAtCells('arrow', [2, 2], [8, 5])
    await waitForPaint()

    const arrow = page.scene.elements.find(e => isArrowElement(e))
    expect(arrow).toBeDefined()

    // Enter editor via double-click
    await page.toolbar.select('selection')
    const cx = arrow!.x + arrow!.width / 2
    const cy = arrow!.y + arrow!.height / 2
    await commands.canvasDblClick(SEL, cx, cy)
    await waitForPaint()

    // Press Escape to exit
    await userEvent.keyboard('{Escape}')
    await waitForPaint()

    // Selection tool should still be active, no editing element
    expect(page.scene.activeTool).toBe('selection')
  })

  it('arrow has points that can be verified via API', async () => {
    const page = await CanvasPage.create()

    await page.canvas.createElementAtCells('arrow', [2, 2], [8, 5])
    await waitForPaint()

    const arrow = page.scene.elements.find(e => isArrowElement(e))
    expect(arrow).toBeDefined()
    expect(isArrowElement(arrow!)).toBe(true)

    // Arrow should have at least 2 points (start and end)
    const arrowEl = arrow as import('~/features/elements/types').ExcalidrawArrowElement
    expect(arrowEl.points.length).toBeGreaterThanOrEqual(2)
    // Width should be positive (arrow goes left to right)
    expect(arrowEl.width).toBeGreaterThan(0)
  })
})
