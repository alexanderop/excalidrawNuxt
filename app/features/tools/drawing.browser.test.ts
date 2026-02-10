import { render } from 'vitest-browser-vue'
import CanvasContainer from '~/features/canvas/components/CanvasContainer.vue'
import { API, UI, waitForCanvasReady, waitForPaint } from '~/__test-utils__/browser'
import { reseed, restoreSeed } from '~/__test-utils__/deterministicSeed'

describe('drawing interaction', () => {
  beforeEach(() => reseed())
  afterEach(() => restoreSeed())

  it('creates a rectangle on drag', async () => {
    const screen = render(CanvasContainer)
    await waitForCanvasReady()
    const ui = new UI(screen)

    await ui.createElementAtCells('rectangle', [2, 2], [5, 5])

    expect(API.elements).toHaveLength(1)
    expect(API.elements[0]!.type).toBe('rectangle')
    expect(API.elements[0]!.width).toBeGreaterThan(0)
    expect(API.elements[0]!.height).toBeGreaterThan(0)
    expect(API.activeTool).toBe('selection')
  })

  it('creates an ellipse on drag', async () => {
    const screen = render(CanvasContainer)
    await waitForCanvasReady()
    const ui = new UI(screen)

    await ui.createElementAtCells('ellipse', [3, 1], [7, 4])

    expect(API.elements).toHaveLength(1)
    expect(API.elements[0]!.type).toBe('ellipse')
    expect(API.activeTool).toBe('selection')
  })

  it('creates a diamond on drag', async () => {
    const screen = render(CanvasContainer)
    await waitForCanvasReady()
    const ui = new UI(screen)

    await ui.createElementAtCells('diamond', [1, 1], [4, 4])

    expect(API.elements).toHaveLength(1)
    expect(API.elements[0]!.type).toBe('diamond')
    expect(API.activeTool).toBe('selection')
  })

  it('creates an arrow on drag', async () => {
    const screen = render(CanvasContainer)
    await waitForCanvasReady()
    const ui = new UI(screen)

    await ui.createElementAtCells('arrow', [1, 1], [8, 4])

    expect(API.elements).toHaveLength(1)
    expect(API.elements[0]!.type).toBe('arrow')
    expect(API.activeTool).toBe('selection')
  })

  it('switches to selection tool after drawing', async () => {
    const screen = render(CanvasContainer)
    await waitForCanvasReady()
    const ui = new UI(screen)

    await ui.createElementAtCells('rectangle', [2, 2], [5, 5])

    expect(API.activeTool).toBe('selection')
  })

  it('auto-selects the drawn element', async () => {
    const screen = render(CanvasContainer)
    await waitForCanvasReady()
    const ui = new UI(screen)

    await ui.createElementAtCells('rectangle', [2, 2], [5, 5])

    const drawn = API.elements[0]!
    expect(API.getSelectedElements().map(e => e.id)).toEqual([drawn.id])
  })

  it('draws multiple shapes in sequence', async () => {
    const screen = render(CanvasContainer)
    await waitForCanvasReady()
    const ui = new UI(screen)

    await ui.createElementAtCells('rectangle', [1, 1], [3, 3])
    await ui.createElementAtCells('ellipse', [5, 1], [8, 4])

    expect(API.elements).toHaveLength(2)
    expect(API.elements[0]!.type).toBe('rectangle')
    expect(API.elements[1]!.type).toBe('ellipse')
  })

  it('createElement returns a live accessor', async () => {
    const screen = render(CanvasContainer)
    await waitForCanvasReady()
    const ui = new UI(screen)

    const ref = await ui.createElement('rectangle', [2, 2], [5, 5])

    expect(ref.id).toBeTruthy()
    const el = ref.get()
    expect(el.type).toBe('rectangle')
    expect(el.width).toBeGreaterThan(0)
  })

  it('element has positive position and dimensions', async () => {
    const screen = render(CanvasContainer)
    await waitForCanvasReady()
    const ui = new UI(screen)

    await ui.createElementAtCells('rectangle', [2, 2], [5, 5])
    await waitForPaint()

    const el = API.elements[0]!
    expect(el.x).toBeGreaterThan(0)
    expect(el.y).toBeGreaterThan(0)
    expect(el.width).toBeGreaterThan(0)
    expect(el.height).toBeGreaterThan(0)
  })
})
