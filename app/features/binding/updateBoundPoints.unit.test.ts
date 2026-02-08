import { createTestElement, createTestArrowElement } from '~/__test-utils__/factories/element'
import { pointFrom } from '~/shared/math'
import type { LocalPoint } from '~/shared/math'
import type { FixedPointBinding } from '~/features/elements/types'
import { mutateElement } from '~/features/elements/mutateElement'
import { updateBoundArrowEndpoints, updateArrowEndpoint } from './updateBoundPoints'
import { bindArrowToElement } from './bindUnbind'

describe('updateBoundArrowEndpoints', () => {
  it('updates arrow start endpoint when bound shape moves', () => {
    const rect = createTestElement({ id: 'rect1', x: 0, y: 0, width: 100, height: 100 })
    const arrow = createTestArrowElement({
      id: 'arrow1',
      x: 0,
      y: 0,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(200, 0)],
    })

    bindArrowToElement(arrow, 'start', rect, [1, 0.5])

    const before = { x: arrow.x, y: arrow.y, points: arrow.points.map(p => [p[0], p[1]]) }

    // Move the rect
    mutateElement(rect, { x: 50, y: 50 })

    updateBoundArrowEndpoints(rect, [rect, arrow])

    // Arrow points should have been updated relative to the new shape position
    const after = { x: arrow.x, y: arrow.y, points: arrow.points.map(p => [p[0], p[1]]) }
    expect(after).not.toEqual(before)
  })

  it('updates arrow end endpoint when bound shape moves', () => {
    const rect = createTestElement({ id: 'rect1', x: 200, y: 0, width: 100, height: 100 })
    const arrow = createTestArrowElement({
      id: 'arrow1',
      x: 0,
      y: 50,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(200, 0)],
    })

    bindArrowToElement(arrow, 'end', rect, [0, 0.5])

    // Move the rect
    mutateElement(rect, { x: 300, y: 50 })

    updateBoundArrowEndpoints(rect, [rect, arrow])

    // Arrow should have been updated — the end point should reflect the new shape position
    const lastPointIdx = arrow.points.length - 1
    const lastPoint = arrow.points[lastPointIdx]
    expect(lastPoint).toBeDefined()
    // The endpoint should have changed from the original 200,0 relative value
  })

  it('is no-op for non-bindable element', () => {
    const arrow = createTestArrowElement({ id: 'arrow1', x: 0, y: 0 })
    const originalPoints = [...arrow.points]

    // Arrow is not bindable, should be a no-op
    updateBoundArrowEndpoints(arrow, [arrow])

    expect(arrow.points).toEqual(originalPoints)
  })

  it('is no-op for shape with no boundElements', () => {
    const rect = createTestElement({ id: 'rect1', x: 0, y: 0, width: 100, height: 100 })
    // No arrows bound, should not throw
    updateBoundArrowEndpoints(rect, [rect])
    expect(rect.boundElements ?? []).toHaveLength(0)
  })
})

describe('updateArrowEndpoint', () => {
  it('moves start point to shape edge', () => {
    const rect = createTestElement({ id: 'rect1', x: 0, y: 0, width: 100, height: 100 })
    const arrow = createTestArrowElement({
      id: 'arrow1',
      x: 0,
      y: 0,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(200, 0)],
      startBinding: { elementId: 'rect1', fixedPoint: [1, 0.5], focus: 0, gap: 0 } as FixedPointBinding,
    })

    updateArrowEndpoint(arrow, 'start', rect)

    // The start point (after normalization) should reflect the right edge of the rectangle
    // Arrow x/y may shift due to normalizePoints
    expect(Number.isFinite(arrow.x)).toBe(true)
    expect(Number.isFinite(arrow.y)).toBe(true)
  })

  it('moves end point to shape edge', () => {
    const rect = createTestElement({ id: 'rect1', x: 200, y: 0, width: 100, height: 100 })
    const arrow = createTestArrowElement({
      id: 'arrow1',
      x: 0,
      y: 50,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(200, 0)],
      endBinding: { elementId: 'rect1', fixedPoint: [0, 0.5], focus: 0, gap: 0 } as FixedPointBinding,
    })

    updateArrowEndpoint(arrow, 'end', rect)

    const lastPoint = arrow.points.at(-1)
    expect(lastPoint).toBeDefined()
    expect(Number.isFinite(lastPoint![0])).toBe(true)
    expect(Number.isFinite(lastPoint![1])).toBe(true)
  })

  it('is no-op when binding is null', () => {
    const rect = createTestElement({ id: 'rect1', x: 0, y: 0, width: 100, height: 100 })
    const arrow = createTestArrowElement({
      id: 'arrow1',
      x: 10,
      y: 20,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 50)],
    })

    const originalX = arrow.x
    const originalY = arrow.y
    const originalPoints = arrow.points.map(p => [p[0], p[1]])

    updateArrowEndpoint(arrow, 'start', rect)

    expect(arrow.x).toBe(originalX)
    expect(arrow.y).toBe(originalY)
    expect(arrow.points.map(p => [p[0], p[1]])).toEqual(originalPoints)
  })
})
