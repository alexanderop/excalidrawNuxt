import { createCanvasContextMock } from '~/__test-utils__/mocks/canvasContextMock'
import { renderGrid, GRID_SPACING } from './renderGrid'

describe('renderGrid', () => {
  it('does not render when zoom is below fade threshold', () => {
    const { ctx, getCallsFor } = createCanvasContextMock()
    renderGrid(ctx, 0, 0, 0.2, 800, 600, 'light')
    expect(getCallsFor('fill')).toHaveLength(0)
  })

  it('renders at full opacity when zoom >= 0.5', () => {
    const { ctx, calls } = createCanvasContextMock()
    renderGrid(ctx, 0, 0, 1, 800, 600, 'light')
    const alphaSet = calls.find(c => c.method === 'set:globalAlpha')
    expect(alphaSet?.args[0]).toBe(1)
  })

  it('fades opacity between 0.3 and 0.5 zoom', () => {
    const { ctx, calls } = createCanvasContextMock()
    renderGrid(ctx, 0, 0, 0.4, 800, 600, 'light')
    const alphaSet = calls.find(c => c.method === 'set:globalAlpha')
    // (0.4 - 0.3) / (0.5 - 0.3) = 0.5
    expect(alphaSet?.args[0]).toBeCloseTo(0.5, 5)
  })

  it('renders grid dots as arcs', () => {
    const { ctx, getCallsFor } = createCanvasContextMock()
    renderGrid(ctx, 0, 0, 1, 100, 100, 'light')
    const arcCalls = getCallsFor('arc')
    expect(arcCalls.length).toBeGreaterThan(0)
  })

  it('applies zoom and scroll transform', () => {
    const { ctx, getCallsFor } = createCanvasContextMock()
    renderGrid(ctx, -100, -50, 2, 800, 600, 'light')
    const scaleCalls = getCallsFor('scale')
    const translateCalls = getCallsFor('translate')
    expect(scaleCalls[0]?.args).toEqual([2, 2])
    expect(translateCalls[0]?.args).toEqual([-100, -50])
  })

  it('exports GRID_SPACING constant', () => {
    expect(GRID_SPACING).toBe(20)
  })
})
