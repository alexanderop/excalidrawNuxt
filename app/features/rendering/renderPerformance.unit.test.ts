import type { RoughCanvas } from 'roughjs/bin/canvas'
import { createCanvasContextMock } from '~/__test-utils__/mocks/canvasContextMock'
import { createTestElement } from '~/__test-utils__/factories/element'
import { renderScene } from './renderScene'

vi.mock('@excalidraw-vue/core/rendering/renderElement', () => ({
  renderElement: vi.fn(),
}))

import { renderElement } from '@excalidraw-vue/core/rendering/renderElement'

function createRoughCanvasMock(): RoughCanvas {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- test mock
  return { draw: vi.fn() } as unknown as RoughCanvas
}

describe('render performance', () => {
  // eslint-disable-next-line vitest/no-hooks -- mock reset
  beforeEach(() => {
    vi.mocked(renderElement).mockClear()
  })

  it('calls renderElement exactly once per visible element', () => {
    const { ctx } = createCanvasContextMock()
    const rc = createRoughCanvasMock()
    const elements = Array.from({ length: 10 }, (_, i) =>
      createTestElement({ id: `el-${i}`, x: i * 50, y: 0, width: 40, height: 40 }),
    )
    renderScene(ctx, rc, elements, 0, 0, 1, 800, 600, 'light')
    // All 10 elements fit in 800px wide viewport
    expect(renderElement).toHaveBeenCalledTimes(10)
  })

  it('does not render offscreen elements', () => {
    const { ctx } = createCanvasContextMock()
    const rc = createRoughCanvasMock()
    const elements = [
      createTestElement({ id: 'far-right', x: 5000, y: 0, width: 50, height: 50 }),
      createTestElement({ id: 'far-bottom', x: 0, y: 5000, width: 50, height: 50 }),
      createTestElement({ id: 'far-left', x: -5000, y: 0, width: 50, height: 50 }),
    ]
    renderScene(ctx, rc, elements, 0, 0, 1, 800, 600, 'light')
    expect(renderElement).not.toHaveBeenCalled()
  })
})
