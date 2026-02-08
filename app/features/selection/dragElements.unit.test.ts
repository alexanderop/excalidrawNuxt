import { describe, it, expect } from 'vitest'
import { createTestElement } from '~/__test-utils__/factories/element'
import { createTestPoint } from '~/__test-utils__/factories/point'
import { pointFrom } from '~/shared/math'
import type { GlobalPoint } from '~/shared/math'
import { startDrag, continueDrag, getConstrainedDelta, hasMoved } from './dragElements'

describe('dragElements', () => {
  it('moves single element by pointer delta', () => {
    const el = createTestElement({ x: 100, y: 100, width: 50, height: 50 })
    const drag = startDrag(createTestPoint(110, 110), [el])
    continueDrag(createTestPoint(160, 210), drag, [el])
    expect(el.x).toBe(150)
    expect(el.y).toBe(200)
  })

  it('moves multiple elements preserving relative positions', () => {
    const a = createTestElement({ id: 'a', x: 0, y: 0, width: 50, height: 50 })
    const b = createTestElement({ id: 'b', x: 100, y: 100, width: 50, height: 50 })
    const drag = startDrag(createTestPoint(25, 25), [a, b])
    continueDrag(createTestPoint(75, 75), drag, [a, b])
    expect(a.x).toBe(50)
    expect(b.x).toBe(150)
    expect(b.x - a.x).toBe(100)
  })

  it('origin-based: no float drift after many moves', () => {
    const el = createTestElement({ x: 0, y: 0, width: 50, height: 50 })
    const drag = startDrag(createTestPoint(0, 0), [el])
    for (let i = 1; i <= 1000; i++) {
      continueDrag(createTestPoint(i * 0.1, i * 0.1), drag, [el])
    }
    expect(el.x).toBeCloseTo(100, 10)
    expect(el.y).toBeCloseTo(100, 10)
  })
})

describe('getConstrainedDelta', () => {
  it('constrains to horizontal axis when dx > dy', () => {
    const delta = getConstrainedDelta(50, 10)
    expect(delta).toEqual(pointFrom<GlobalPoint>(50, 0))
  })

  it('constrains to vertical axis when dy > dx', () => {
    const delta = getConstrainedDelta(5, 80)
    expect(delta).toEqual(pointFrom<GlobalPoint>(0, 80))
  })
})

describe('hasMoved', () => {
  it('returns false when pointer has not moved', () => {
    const drag = startDrag(createTestPoint(10, 10), [])
    expect(hasMoved(drag, createTestPoint(10, 10))).toBe(false)
  })

  it('returns true when pointer has moved beyond threshold', () => {
    const drag = startDrag(createTestPoint(10, 10), [])
    expect(hasMoved(drag, createTestPoint(15, 10))).toBe(true)
  })
})
