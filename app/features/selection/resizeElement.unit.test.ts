import { describe, it, expect } from 'vitest'
import { createTestElement } from '~/__test-utils__/factories/element'
import { resizeElement } from './resizeElement'
import type { ResizeState } from './resizeElement'

describe('resizeElement', () => {
  it('SE handle: increases width and height', () => {
    const el = createTestElement({ x: 0, y: 0, width: 100, height: 100 })
    const state: ResizeState = {
      handleType: 'se',
      originalBounds: { x: 0, y: 0, width: 100, height: 100 },
      origin: { x: 100, y: 100 },
    }
    resizeElement({ x: 150, y: 130 }, state, el, false)
    expect(el.width).toBe(150)
    expect(el.height).toBe(130)
    expect(el.x).toBe(0)
    expect(el.y).toBe(0)
  })

  it('NW handle: moves origin and shrinks', () => {
    const el = createTestElement({ x: 0, y: 0, width: 100, height: 100 })
    const state: ResizeState = {
      handleType: 'nw',
      originalBounds: { x: 0, y: 0, width: 100, height: 100 },
      origin: { x: 0, y: 0 },
    }
    resizeElement({ x: 20, y: 30 }, state, el, false)
    expect(el.x).toBe(20)
    expect(el.y).toBe(30)
    expect(el.width).toBe(80)
    expect(el.height).toBe(70)
  })

  it('E handle: only changes width', () => {
    const el = createTestElement({ x: 0, y: 0, width: 100, height: 100 })
    const state: ResizeState = {
      handleType: 'e',
      originalBounds: { x: 0, y: 0, width: 100, height: 100 },
      origin: { x: 100, y: 50 },
    }
    resizeElement({ x: 200, y: 80 }, state, el, false)
    expect(el.width).toBe(200)
    expect(el.height).toBe(100)
  })

  it('N handle: only changes height and y', () => {
    const el = createTestElement({ x: 0, y: 0, width: 100, height: 100 })
    const state: ResizeState = {
      handleType: 'n',
      originalBounds: { x: 0, y: 0, width: 100, height: 100 },
      origin: { x: 50, y: 0 },
    }
    resizeElement({ x: 50, y: 20 }, state, el, false)
    expect(el.y).toBe(20)
    expect(el.height).toBe(80)
    expect(el.width).toBe(100)
  })

  it('shift locks aspect ratio', () => {
    const el = createTestElement({ x: 0, y: 0, width: 100, height: 50 })
    const state: ResizeState = {
      handleType: 'se',
      originalBounds: { x: 0, y: 0, width: 100, height: 50 },
      origin: { x: 100, y: 50 },
    }
    resizeElement({ x: 200, y: 80 }, state, el, true)
    expect(el.width / el.height).toBeCloseTo(2, 5)
  })

  it('negative drag flips to positive dimensions', () => {
    const el = createTestElement({ x: 50, y: 50, width: 100, height: 100 })
    const state: ResizeState = {
      handleType: 'se',
      originalBounds: { x: 50, y: 50, width: 100, height: 100 },
      origin: { x: 150, y: 150 },
    }
    resizeElement({ x: 30, y: 30 }, state, el, false)
    expect(el.width).toBeGreaterThan(0)
    expect(el.height).toBeGreaterThan(0)
  })

  it('enforces minimum size of 1x1', () => {
    const el = createTestElement({ x: 0, y: 0, width: 100, height: 100 })
    const state: ResizeState = {
      handleType: 'se',
      originalBounds: { x: 0, y: 0, width: 100, height: 100 },
      origin: { x: 100, y: 100 },
    }
    resizeElement({ x: 0.1, y: 0.1 }, state, el, false)
    expect(el.width).toBeGreaterThanOrEqual(1)
    expect(el.height).toBeGreaterThanOrEqual(1)
  })
})
