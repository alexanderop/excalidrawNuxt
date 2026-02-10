/* eslint-disable vitest/expect-expect -- page object methods wrap expect() */
import { CanvasPage } from '~/__test-utils__/browser'
import { waitForPaint } from '~/__test-utils__/browser/waiters'

describe('drawing interaction', () => {
  it('creates a rectangle on drag', async () => {
    const page = await CanvasPage.create()

    await page.canvas.createElementAtCells('rectangle', [2, 2], [5, 5])

    page.scene.expectElementCount(1)
    page.scene.expectElementType(0, 'rectangle')
    expect(page.scene.elements[0]!.width).toBeGreaterThan(0)
    expect(page.scene.elements[0]!.height).toBeGreaterThan(0)
    expect(page.scene.activeTool).toBe('selection')
  })

  it('creates an ellipse on drag', async () => {
    const page = await CanvasPage.create()

    await page.canvas.createElementAtCells('ellipse', [3, 1], [7, 4])

    page.scene.expectElementCount(1)
    page.scene.expectElementType(0, 'ellipse')
    expect(page.scene.activeTool).toBe('selection')
  })

  it('creates a diamond on drag', async () => {
    const page = await CanvasPage.create()

    await page.canvas.createElementAtCells('diamond', [1, 1], [4, 4])

    page.scene.expectElementCount(1)
    page.scene.expectElementType(0, 'diamond')
    expect(page.scene.activeTool).toBe('selection')
  })

  it('creates an arrow on drag', async () => {
    const page = await CanvasPage.create()

    await page.canvas.createElementAtCells('arrow', [1, 1], [8, 4])

    page.scene.expectElementCount(1)
    page.scene.expectElementType(0, 'arrow')
    expect(page.scene.activeTool).toBe('selection')
  })

  it('switches to selection tool after drawing', async () => {
    const page = await CanvasPage.create()

    await page.canvas.createElementAtCells('rectangle', [2, 2], [5, 5])

    expect(page.scene.activeTool).toBe('selection')
  })

  it('auto-selects the drawn element', async () => {
    const page = await CanvasPage.create()

    await page.canvas.createElementAtCells('rectangle', [2, 2], [5, 5])

    const drawn = page.scene.elements[0]!
    page.selection.expectSelected(drawn.id)
  })

  it('draws multiple shapes in sequence', async () => {
    const page = await CanvasPage.create()

    await page.canvas.createElementAtCells('rectangle', [1, 1], [3, 3])
    await page.canvas.createElementAtCells('ellipse', [5, 1], [8, 4])

    page.scene.expectElementCount(2)
    page.scene.expectElementType(0, 'rectangle')
    page.scene.expectElementType(1, 'ellipse')
  })

  it('createElement returns a live accessor', async () => {
    const page = await CanvasPage.create()

    const ref = await page.canvas.createElement('rectangle', [2, 2], [5, 5])

    expect(ref.id).toBeTruthy()
    const el = ref.get()
    expect(el.type).toBe('rectangle')
    expect(el.width).toBeGreaterThan(0)
  })

  it('element has positive position and dimensions', async () => {
    const page = await CanvasPage.create()

    await page.canvas.createElementAtCells('rectangle', [2, 2], [5, 5])
    await waitForPaint()

    const el = page.scene.elements[0]!
    expect(el.x).toBeGreaterThan(0)
    expect(el.y).toBeGreaterThan(0)
    expect(el.width).toBeGreaterThan(0)
    expect(el.height).toBeGreaterThan(0)
  })
})
