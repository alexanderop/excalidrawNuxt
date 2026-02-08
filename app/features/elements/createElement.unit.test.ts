import type { ExcalidrawElement, ExcalidrawArrowElement } from './types'
import { createElement } from './createElement'
import {
  DEFAULT_BG_COLOR,
  DEFAULT_FILL_STYLE,
  DEFAULT_OPACITY,
  DEFAULT_ROUGHNESS,
  DEFAULT_STROKE_COLOR,
  DEFAULT_STROKE_WIDTH,
} from './constants'

function assertIsArrow(el: ExcalidrawElement): asserts el is ExcalidrawArrowElement {
  expect(el.type).toBe('arrow')
}

describe('createElement', () => {
  it('creates an element with the correct type', () => {
    const el = createElement('rectangle', 10, 20)
    expect(el.type).toBe('rectangle')
  })

  it('creates an element with the correct position', () => {
    const el = createElement('ellipse', 42, 99)
    expect(el.x).toBe(42)
    expect(el.y).toBe(99)
  })

  it('starts with width and height of 0', () => {
    const el = createElement('diamond', 0, 0)
    expect(el.width).toBe(0)
    expect(el.height).toBe(0)
  })

  it('generates a unique id', () => {
    const a = createElement('rectangle', 0, 0)
    const b = createElement('rectangle', 0, 0)
    expect(a.id).not.toBe(b.id)
  })

  it('generates a numeric seed', () => {
    const el = createElement('rectangle', 0, 0)
    expect(typeof el.seed).toBe('number')
    expect(Number.isInteger(el.seed)).toBe(true)
  })

  it('generates a numeric versionNonce', () => {
    const el = createElement('rectangle', 0, 0)
    expect(typeof el.versionNonce).toBe('number')
    expect(Number.isInteger(el.versionNonce)).toBe(true)
  })

  it('applies default stroke and fill properties', () => {
    const el = createElement('rectangle', 0, 0)
    expect(el.strokeColor).toBe(DEFAULT_STROKE_COLOR)
    expect(el.backgroundColor).toBe(DEFAULT_BG_COLOR)
    expect(el.fillStyle).toBe(DEFAULT_FILL_STYLE)
    expect(el.strokeWidth).toBe(DEFAULT_STROKE_WIDTH)
    expect(el.roughness).toBe(DEFAULT_ROUGHNESS)
    expect(el.opacity).toBe(DEFAULT_OPACITY)
  })

  it('defaults angle to 0 and isDeleted to false', () => {
    const el = createElement('rectangle', 0, 0)
    expect(el.angle).toBe(0)
    expect(el.isDeleted).toBe(false)
  })

  it('applies overrides', () => {
    const el = createElement('rectangle', 0, 0, {
      width: 200,
      height: 150,
      strokeColor: '#ff0000',
      opacity: 50,
    })
    expect(el.width).toBe(200)
    expect(el.height).toBe(150)
    expect(el.strokeColor).toBe('#ff0000')
    expect(el.opacity).toBe(50)
  })

  describe('type-specific properties', () => {
    it('creates rectangle with correct type', () => {
      const el = createElement('rectangle', 10, 20)
      expect(el.type).toBe('rectangle')
      expect(el.x).toBe(10)
      expect(el.y).toBe(20)
    })

    it('creates ellipse with correct type', () => {
      const el = createElement('ellipse', 30, 40)
      expect(el.type).toBe('ellipse')
      expect(el.x).toBe(30)
      expect(el.y).toBe(40)
    })

    it('creates diamond with correct type', () => {
      const el = createElement('diamond', 50, 60)
      expect(el.type).toBe('diamond')
      expect(el.x).toBe(50)
      expect(el.y).toBe(60)
    })

    it('creates arrow with points and arrowheads', () => {
      const el = createElement('arrow', 70, 80)
      assertIsArrow(el)
      expect(el.points).toHaveLength(1)
      expect(el.points[0]).toEqual([0, 0])
      expect(el.startArrowhead).toBeNull()
      expect(el.endArrowhead).toBe('arrow')
      expect(el.startBinding).toBeNull()
      expect(el.endBinding).toBeNull()
    })

    it('initializes boundElements as empty array for all types', () => {
      const rect = createElement('rectangle', 0, 0)
      const ellipse = createElement('ellipse', 0, 0)
      const diamond = createElement('diamond', 0, 0)
      const arrow = createElement('arrow', 0, 0)
      expect(rect.boundElements).toEqual([])
      expect(ellipse.boundElements).toEqual([])
      expect(diamond.boundElements).toEqual([])
      expect(arrow.boundElements).toEqual([])
    })

    it('initializes groupIds as empty array for all types', () => {
      const rect = createElement('rectangle', 0, 0)
      const arrow = createElement('arrow', 0, 0)
      expect(rect.groupIds).toEqual([])
      expect(arrow.groupIds).toEqual([])
    })
  })
})
