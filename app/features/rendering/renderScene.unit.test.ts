import type { RoughCanvas } from 'roughjs/bin/canvas'
import { createCanvasContextMock } from '~/__test-utils__/mocks/canvasContextMock'
import { createTestElement } from '~/__test-utils__/factories/element'
import { renderScene } from './renderScene'

vi.mock('./renderElement', () => ({
  renderElement: vi.fn(),
}))

import { renderElement } from './renderElement'

function createRoughCanvasMock(): RoughCanvas {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- test mock
  return { draw: vi.fn() } as unknown as RoughCanvas
}

describe('renderScene', () => {
  // eslint-disable-next-line vitest/no-hooks -- mock reset
  beforeEach(() => {
    vi.mocked(renderElement).mockClear()
  })

  it('applies zoom and scroll transform', () => {
    const { ctx, getCallsFor } = createCanvasContextMock()
    const rc = createRoughCanvasMock()
    renderScene(ctx, rc, [], -50, -30, 2, 800, 600, 'light')
    const scaleCalls = getCallsFor('scale')
    const translateCalls = getCallsFor('translate')
    expect(scaleCalls[0]?.args).toEqual([2, 2])
    expect(translateCalls[0]?.args).toEqual([-50, -30])
  })

  it('renders all visible elements', () => {
    const { ctx } = createCanvasContextMock()
    const rc = createRoughCanvasMock()
    const elements = [
      createTestElement({ id: 'a', x: 10, y: 10, width: 50, height: 50 }),
      createTestElement({ id: 'b', x: 100, y: 100, width: 50, height: 50 }),
      createTestElement({ id: 'c', x: 200, y: 200, width: 50, height: 50 }),
    ]
    // viewport: scrollX=0, scrollY=0, zoom=1, 800x600
    // viewMinX=0, viewMinY=0, viewMaxX=800, viewMaxY=600
    // All elements are within viewport
    renderScene(ctx, rc, elements, 0, 0, 1, 800, 600, 'light')
    expect(renderElement).toHaveBeenCalledTimes(3)
  })

  it('skips elements outside viewport', () => {
    const { ctx } = createCanvasContextMock()
    const rc = createRoughCanvasMock()
    const elements = [
      createTestElement({ id: 'visible', x: 10, y: 10, width: 50, height: 50 }),
      createTestElement({ id: 'offscreen', x: 10_000, y: 10_000, width: 50, height: 50 }),
    ]
    renderScene(ctx, rc, elements, 0, 0, 1, 800, 600, 'light')
    expect(renderElement).toHaveBeenCalledTimes(1)
  })

  it('brackets with save and restore', () => {
    const { ctx, calls } = createCanvasContextMock()
    const rc = createRoughCanvasMock()
    renderScene(ctx, rc, [], 0, 0, 1, 800, 600, 'light')
    const methods = calls.map(c => c.method)
    expect(methods[0]).toBe('save')
    expect(methods.at(-1)).toBe('restore')
  })
})
