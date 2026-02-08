import type { RoughCanvas } from 'roughjs/bin/canvas'
import { createCanvasContextMock } from '~/__test-utils__/mocks/canvasContextMock'
import { createTestElement, createTestArrowElement } from '~/__test-utils__/factories/element'
import { pointFrom } from '~/shared/math'
import type { LocalPoint } from '~/shared/math'
import { renderElement } from './renderElement'

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- test mock with partial Drawable
const mockDrawable = { shape: 'test', sets: [], options: {} } as unknown as import('roughjs/bin/core').Drawable
vi.mock('@excalidraw-vue/core/rendering/shapeGenerator', () => ({
  generateShape: vi.fn(() => mockDrawable),
}))

vi.mock('@excalidraw-vue/core/rendering/arrowhead', () => ({
  renderArrowheads: vi.fn(),
}))

// Get references to mocked functions
import { generateShape } from '@excalidraw-vue/core/rendering/shapeGenerator'
import { renderArrowheads } from '@excalidraw-vue/core/rendering/arrowhead'

function createRoughCanvasMock(): RoughCanvas {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- test mock
  return { draw: vi.fn() } as unknown as RoughCanvas
}

describe('renderElement', () => {
  // eslint-disable-next-line vitest/no-hooks -- mock reset
  beforeEach(() => {
    vi.mocked(generateShape).mockReturnValue(mockDrawable)
    vi.mocked(renderArrowheads).mockClear()
  })

  it('skips deleted elements', () => {
    const { ctx, getCallsFor } = createCanvasContextMock()
    const rc = createRoughCanvasMock()
    const el = createTestElement({ isDeleted: true })
    renderElement(ctx, rc, el, 'light')
    expect(getCallsFor('save')).toHaveLength(0)
  })

  it('skips arrows with fewer than 2 points', () => {
    const { ctx, getCallsFor } = createCanvasContextMock()
    const rc = createRoughCanvasMock()
    const el = createTestArrowElement({ points: [pointFrom<LocalPoint>(0, 0)] })
    renderElement(ctx, rc, el, 'light')
    expect(getCallsFor('save')).toHaveLength(0)
  })

  it('skips zero-size non-arrow elements', () => {
    const { ctx, getCallsFor } = createCanvasContextMock()
    const rc = createRoughCanvasMock()
    const el = createTestElement({ width: 0, height: 0 })
    renderElement(ctx, rc, el, 'light')
    expect(getCallsFor('save')).toHaveLength(0)
  })

  it('applies translation to element position', () => {
    const { ctx, getCallsFor } = createCanvasContextMock()
    const rc = createRoughCanvasMock()
    const el = createTestElement({ x: 30, y: 40, width: 100, height: 50 })
    renderElement(ctx, rc, el, 'light')
    const translateCalls = getCallsFor('translate')
    expect(translateCalls).toHaveLength(1)
    expect(translateCalls[0]?.args).toEqual([30, 40])
  })

  it('applies opacity from element', () => {
    const { ctx, calls } = createCanvasContextMock()
    const rc = createRoughCanvasMock()
    const el = createTestElement({ opacity: 50, width: 100, height: 50 })
    renderElement(ctx, rc, el, 'light')
    const alphaSet = calls.find(c => c.method === 'set:globalAlpha')
    expect(alphaSet).toBeDefined()
    expect(alphaSet?.args[0]).toBe(0.5)
  })

  it('calls rc.draw with generated shape', () => {
    const { ctx } = createCanvasContextMock()
    const rc = createRoughCanvasMock()
    const el = createTestElement({ width: 100, height: 50 })
    renderElement(ctx, rc, el, 'light')
    expect(rc.draw).toHaveBeenCalledWith(mockDrawable)
  })

  it('renders arrowheads for arrow elements', () => {
    const { ctx } = createCanvasContextMock()
    const rc = createRoughCanvasMock()
    const el = createTestArrowElement({ points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 50)] })
    renderElement(ctx, rc, el, 'light')
    expect(renderArrowheads).toHaveBeenCalledTimes(1)
    const callArgs = vi.mocked(renderArrowheads).mock.calls[0]
    expect(callArgs).toBeDefined()
    const [argCtx, argEl, argTheme] = callArgs!
    expect(argCtx).toBe(ctx)
    expect(argEl).toBe(el)
    expect(argTheme).toBe('light')
  })

  it('does not render arrowheads for non-arrow elements', () => {
    const { ctx } = createCanvasContextMock()
    const rc = createRoughCanvasMock()
    const el = createTestElement({ width: 100, height: 50 })
    renderElement(ctx, rc, el, 'light')
    expect(renderArrowheads).not.toHaveBeenCalled()
  })

  it('brackets rendering with save and restore', () => {
    const { ctx, calls } = createCanvasContextMock()
    const rc = createRoughCanvasMock()
    const el = createTestElement({ width: 100, height: 50 })
    renderElement(ctx, rc, el, 'light')
    const methodNames = calls.map(c => c.method)
    expect(methodNames[0]).toBe('save')
    expect(methodNames.at(-1)).toBe('restore')
  })
})
