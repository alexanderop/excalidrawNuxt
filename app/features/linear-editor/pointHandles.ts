import type { Point } from '~/shared/math'
import { distance, midpoint } from '~/shared/math'
import type { ExcalidrawArrowElement } from '~/features/elements/types'
import { POINT_HIT_THRESHOLD, MIDPOINT_HIT_THRESHOLD } from './constants'

/**
 * Get scene-space positions for all points of an arrow element.
 */
export function getPointPositions(element: ExcalidrawArrowElement): Point[] {
  return element.points.map(p => ({
    x: p.x + element.x,
    y: p.y + element.y,
  }))
}

/**
 * Get scene-space midpoint positions between consecutive points.
 */
export function getMidpointPositions(element: ExcalidrawArrowElement): Point[] {
  const scenePoints = getPointPositions(element)
  const midpoints: Point[] = []
  for (let i = 0; i < scenePoints.length - 1; i++) {
    const a = scenePoints[i]
    const b = scenePoints[i + 1]
    if (!a || !b) continue
    midpoints.push(midpoint(a, b))
  }
  return midpoints
}

/**
 * Hit-test a scene point against all point handles.
 * Returns the index of the hit point, or -1 if none.
 */
export function hitTestPointHandles(
  scenePoint: Point,
  element: ExcalidrawArrowElement,
  zoom: number,
): number {
  const positions = getPointPositions(element)
  const threshold = POINT_HIT_THRESHOLD / zoom

  for (const [i, position] of positions.entries()) {
    if (distance(scenePoint, position) <= threshold) return i
  }
  return -1
}

/**
 * Hit-test a scene point against segment midpoints.
 * Returns the segment index (midpoint between point[i] and point[i+1]), or -1.
 */
export function hitTestMidpoints(
  scenePoint: Point,
  element: ExcalidrawArrowElement,
  zoom: number,
): number {
  const midpoints = getMidpointPositions(element)
  const threshold = MIDPOINT_HIT_THRESHOLD / zoom

  for (const [i, midpoint_] of midpoints.entries()) {
    if (distance(scenePoint, midpoint_) <= threshold) return i
  }
  return -1
}

/**
 * Insert a new point into the points array at the given segment index.
 * The new point is placed at the segment midpoint.
 * Returns a new points array (does not mutate).
 */
export function insertPointAtSegment(
  points: readonly Point[],
  segmentIndex: number,
): { points: readonly Point[]; insertedIndex: number } {
  const a = points[segmentIndex]
  const b = points[segmentIndex + 1]
  if (!a || !b) return { points, insertedIndex: segmentIndex }
  const mid = midpoint(a, b)

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
  points: readonly Point[],
  indices: ReadonlySet<number>,
): readonly Point[] | null {
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
  points: readonly Point[],
): { x: number; y: number; points: readonly Point[] } {
  const first = points[0]
  if (!first || (first.x === 0 && first.y === 0)) {
    return { x: elementX, y: elementY, points }
  }

  const dx = first.x
  const dy = first.y

  return {
    x: elementX + dx,
    y: elementY + dy,
    points: points.map(p => ({ x: p.x - dx, y: p.y - dy })),
  }
}

/**
 * Move a single point by a delta, returning new points array.
 * If moving point[0], normalizes afterward.
 */
export function movePoint(
  elementX: number,
  elementY: number,
  points: readonly Point[],
  pointIndex: number,
  dx: number,
  dy: number,
): { x: number; y: number; points: readonly Point[] } {
  const newPoints = points.map((p, i) => {
    if (i !== pointIndex) return p
    return { x: p.x + dx, y: p.y + dy }
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
  points: readonly Point[],
  indices: ReadonlySet<number>,
  dx: number,
  dy: number,
): { x: number; y: number; points: readonly Point[] } {
  const newPoints = points.map((p, i) => {
    if (!indices.has(i)) return p
    return { x: p.x + dx, y: p.y + dy }
  })

  return normalizePoints(elementX, elementY, newPoints)
}

/**
 * Compute width/height from points array (for keeping element dimensions in sync).
 */
export function computeDimensionsFromPoints(points: readonly Point[]): {
  width: number
  height: number
} {
  if (points.length === 0) return { width: 0, height: 0 }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const p of points) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }

  return { width: maxX - minX, height: maxY - minY }
}
