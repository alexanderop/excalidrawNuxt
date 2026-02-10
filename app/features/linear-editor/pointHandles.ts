import { pointFrom, pointDistance, pointCenter } from '~/shared/math'
import type { GlobalPoint, LocalPoint } from '~/shared/math'
import type { ExcalidrawLinearElement } from '~/features/elements/types'
import { POINT_HIT_THRESHOLD, MIDPOINT_HIT_THRESHOLD } from './constants'

/**
 * Get scene-space positions for all points of an arrow element.
 */
export function getPointPositions(element: ExcalidrawLinearElement): GlobalPoint[] {
  return element.points.map(p => pointFrom<GlobalPoint>(
    p[0] + element.x,
    p[1] + element.y,
  ))
}

/**
 * Get scene-space midpoint positions between consecutive points.
 */
export function getMidpointPositions(element: ExcalidrawLinearElement): GlobalPoint[] {
  const scenePoints = getPointPositions(element)
  const midpoints: GlobalPoint[] = []
  for (let i = 0; i < scenePoints.length - 1; i++) {
    const a = scenePoints[i]
    const b = scenePoints[i + 1]
    if (!a || !b) continue
    midpoints.push(pointCenter(a, b))
  }
  return midpoints
}

/**
 * Hit-test a scene point against all point handles.
 * Returns the index of the hit point, or -1 if none.
 */
export function hitTestPointHandles(
  scenePoint: GlobalPoint,
  element: ExcalidrawLinearElement,
  zoom: number,
): number {
  const positions = getPointPositions(element)
  const threshold = POINT_HIT_THRESHOLD / zoom

  for (const [i, position] of positions.entries()) {
    if (pointDistance(scenePoint, position) <= threshold) return i
  }
  return -1
}

/**
 * Hit-test a scene point against segment midpoints.
 * Returns the segment index (midpoint between point[i] and point[i+1]), or -1.
 */
export function hitTestMidpoints(
  scenePoint: GlobalPoint,
  element: ExcalidrawLinearElement,
  zoom: number,
): number {
  const midpoints = getMidpointPositions(element)
  const threshold = MIDPOINT_HIT_THRESHOLD / zoom

  for (const [i, midpoint] of midpoints.entries()) {
    if (pointDistance(scenePoint, midpoint) <= threshold) return i
  }
  return -1
}

/**
 * Insert a new point into the points array at the given segment index.
 * The new point is placed at the segment midpoint.
 * Returns a new points array (does not mutate).
 */
export function insertPointAtSegment(
  points: readonly LocalPoint[],
  segmentIndex: number,
): { points: readonly LocalPoint[]; insertedIndex: number } {
  const a = points[segmentIndex]
  const b = points[segmentIndex + 1]
  if (!a || !b) return { points, insertedIndex: segmentIndex }
  const mid = pointCenter(a, b)

  const newPoints = [
    ...points.slice(0, segmentIndex + 1),
    mid,
    ...points.slice(segmentIndex + 1),
  ]

  return { points: newPoints, insertedIndex: segmentIndex + 1 }
}

/**
 * Remove points at the given indices from the points array.
 * Will not remove if it would leave fewer than 2 points.
 * Returns a new points array (does not mutate), or null if removal not possible.
 */
export function removePoints(
  points: readonly LocalPoint[],
  indices: ReadonlySet<number>,
): readonly LocalPoint[] | null {
  const remaining = points.filter((_, i) => !indices.has(i))
  if (remaining.length < 2) return null
  return remaining
}

/**
 * Normalize points so that point[0] is always at (0, 0).
 * When point[0] moves, the element's x/y shifts accordingly
 * and all other points are offset to compensate.
 *
 * Returns the new element position and normalized points array.
 */
export function normalizePoints(
  elementX: number,
  elementY: number,
  points: readonly LocalPoint[],
): { x: number; y: number; points: readonly LocalPoint[] } {
  const first = points[0]
  if (!first || (first[0] === 0 && first[1] === 0)) {
    return { x: elementX, y: elementY, points }
  }

  const dx = first[0]
  const dy = first[1]

  return {
    x: elementX + dx,
    y: elementY + dy,
    points: points.map(p => pointFrom<LocalPoint>(p[0] - dx, p[1] - dy)),
  }
}

/**
 * Move a single point by a delta, returning new points array.
 * If moving point[0], normalizes afterward.
 */
export function movePoint(
  elementX: number,
  elementY: number,
  points: readonly LocalPoint[],
  pointIndex: number,
  dx: number,
  dy: number,
): { x: number; y: number; points: readonly LocalPoint[] } {
  const newPoints = points.map((p, i) => {
    if (i !== pointIndex) return p
    return pointFrom<LocalPoint>(p[0] + dx, p[1] + dy)
  })

  return normalizePoints(elementX, elementY, newPoints)
}

/**
 * Move multiple points by a delta, returning new points array.
 * Normalizes afterward.
 */
export function movePoints(
  elementX: number,
  elementY: number,
  points: readonly LocalPoint[],
  indices: ReadonlySet<number>,
  dx: number,
  dy: number,
): { x: number; y: number; points: readonly LocalPoint[] } {
  const newPoints = points.map((p, i) => {
    if (!indices.has(i)) return p
    return pointFrom<LocalPoint>(p[0] + dx, p[1] + dy)
  })

  return normalizePoints(elementX, elementY, newPoints)
}

export { getSizeFromPoints } from '@excalidraw/common'
