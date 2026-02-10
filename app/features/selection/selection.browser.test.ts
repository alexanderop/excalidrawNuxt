/* eslint-disable vitest/expect-expect -- assertSelectedElements wraps expect() */
import { render } from 'vitest-browser-vue'
import CanvasContainer from '~/features/canvas/components/CanvasContainer.vue'
import { API, UI, waitForCanvasReady, waitForPaint } from '~/__test-utils__/browser'
import { assertSelectedElements } from '~/__test-utils__/matchers/assertSelectedElements'
import { reseed, restoreSeed } from '~/__test-utils__/deterministicSeed'

describe('selection', () => {
  beforeEach(() => reseed())
  afterEach(() => restoreSeed())

  it('selects element by clicking on it', async () => {
    const screen = render(CanvasContainer)
    await waitForCanvasReady()
    const ui = new UI(screen)

    const rect = await ui.createElement('rectangle', [2, 2], [5, 5])
    API.clearSelection()
    await waitForPaint()

    // Click on the rectangle center
    await ui.grid.clickCenter([2, 2], [5, 5])

    assertSelectedElements(rect.id)
  })

  it('adds to selection with shift-click', async () => {
    const screen = render(CanvasContainer)
    await waitForCanvasReady()
    const ui = new UI(screen)

    const r1 = await ui.createElement('rectangle', [1, 1], [3, 3])
    const r2 = await ui.createElement('ellipse', [5, 1], [7, 3])
    API.clearSelection()
    await waitForPaint()

    // Click first element
    await ui.grid.clickCenter([1, 1], [3, 3])
    assertSelectedElements(r1.id)

    // Shift-click second element
    await ui.grid.clickCenter([5, 1], [7, 3], { shiftKey: true })
    assertSelectedElements(r1.id, r2.id)
  })

  it('box-selects multiple elements', async () => {
    const screen = render(CanvasContainer)
    await waitForCanvasReady()
    const ui = new UI(screen)

    // Draw two elements by interacting with the canvas
    const r1 = await ui.createElement('rectangle', [1, 1], [3, 3])
    const r2 = await ui.createElement('ellipse', [5, 1], [7, 3])
    API.clearSelection()
    await waitForPaint()

    // Drag selection box from empty space around both
    await ui.grid.drag([0, 0], [8, 4])
    await waitForPaint()

    assertSelectedElements(r1.id, r2.id)
  })

  it('deselects on empty canvas click', async () => {
    const screen = render(CanvasContainer)
    await waitForCanvasReady()
    const ui = new UI(screen)

    await ui.createElement('rectangle', [2, 2], [4, 4])
    expect(API.getSelectedElements()).toHaveLength(1)

    // Click on empty space far from the rectangle
    await ui.grid.click([10, 8])

    assertSelectedElements() // nothing selected
  })

  it('clearSelection empties selection', async () => {
    const screen = render(CanvasContainer)
    await waitForCanvasReady()
    const ui = new UI(screen)

    await ui.createElement('rectangle', [2, 2], [5, 5])
    expect(API.getSelectedElements()).toHaveLength(1)

    API.clearSelection()
    assertSelectedElements()
  })

  it('programmatic setSelectedElements works', async () => {
    render(CanvasContainer)
    await waitForCanvasReady()

    const r1 = API.addElement({ x: 50, y: 50, width: 60, height: 60 })
    const r2 = API.addElement({ x: 200, y: 50, width: 60, height: 60 })
    API.h.markStaticDirty()
    await waitForPaint()

    API.setSelectedElements([r1, r2])
    assertSelectedElements(r1.id, r2.id)

    API.setSelectedElements([r2])
    assertSelectedElements(r2.id)
  })
})
