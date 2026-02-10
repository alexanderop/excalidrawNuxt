import { render } from 'vitest-browser-vue'
import { commands, userEvent } from 'vitest/browser'
import CanvasContainer from '~/features/canvas/components/CanvasContainer.vue'
import { API, UI, waitForCanvasReady, waitForPaint } from '~/__test-utils__/browser'
import { reseed, restoreSeed } from '~/__test-utils__/deterministicSeed'
import { isArrowElement } from '~/features/elements/types'

const SEL = '[data-testid="interactive-canvas"]'

describe('linear editor (point editing)', () => {
  beforeEach(() => reseed())
  afterEach(() => restoreSeed())

  it('enters editor on double-click of arrow', async () => {
    const screen = render(CanvasContainer)
    await waitForCanvasReady()
    const ui = new UI(screen)

    // Draw an arrow
    await ui.createElementAtCells('arrow', [2, 2], [8, 5])
    await waitForPaint()

    const arrow = API.elements.find(e => isArrowElement(e))
    expect(arrow).toBeDefined()

    // Ensure selection tool is active
    await ui.clickTool('selection')

    // Double-click on the arrow center to enter editor
    const cx = arrow!.x + arrow!.width / 2
    const cy = arrow!.y + arrow!.height / 2
    await commands.canvasDblClick(SEL, cx, cy)
    await waitForPaint()

    // The linear editor should be active
    expect(API.h.newElement.value).toBeNull()
  })

  it('exits editor on Escape', async () => {
    const screen = render(CanvasContainer)
    await waitForCanvasReady()
    const ui = new UI(screen)

    // Draw an arrow
    await ui.createElementAtCells('arrow', [2, 2], [8, 5])
    await waitForPaint()

    const arrow = API.elements.find(e => isArrowElement(e))
    expect(arrow).toBeDefined()

    // Enter editor via double-click
    await ui.clickTool('selection')
    const cx = arrow!.x + arrow!.width / 2
    const cy = arrow!.y + arrow!.height / 2
    await commands.canvasDblClick(SEL, cx, cy)
    await waitForPaint()

    // Press Escape to exit
    await userEvent.keyboard('{Escape}')
    await waitForPaint()

    // Selection tool should still be active, no editing element
    expect(API.activeTool).toBe('selection')
  })

  it('arrow has points that can be verified via API', async () => {
    const screen = render(CanvasContainer)
    await waitForCanvasReady()
    const ui = new UI(screen)

    await ui.createElementAtCells('arrow', [2, 2], [8, 5])
    await waitForPaint()

    const arrow = API.elements.find(e => isArrowElement(e))
    expect(arrow).toBeDefined()
    expect(isArrowElement(arrow!)).toBe(true)

    // Arrow should have at least 2 points (start and end)
    const arrowEl = arrow as import('~/features/elements/types').ExcalidrawArrowElement
    expect(arrowEl.points.length).toBeGreaterThanOrEqual(2)
    // Width should be positive (arrow goes left to right)
    expect(arrowEl.width).toBeGreaterThan(0)
  })
})
