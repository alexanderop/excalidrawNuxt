/**
 * Thin re-export layer over @excalidraw/math.
 *
 * All point types are branded tuples: GlobalPoint (scene coordinates)
 * and LocalPoint (element-relative coordinates).
 *
 * Project-specific utilities (snapAngle, normalizePoints, computeDimensionsFromPoints)
 * live here since they have no upstream equivalent.
 */

// Re-export from @excalidraw/math directly
export {
  pointFrom,
  pointCenter,
  pointDistance,
  pointDistanceSq,
  pointRotateRads,
  pointsEqual,
  distanceToLineSegment,
  lineSegment,
  clamp,
} from '@excalidraw/math'

export type {
  GlobalPoint,
  LocalPoint,
  Radians,
  LineSegment,
} from '@excalidraw/math'

// Local imports for use within this file
import { pointFrom } from '@excalidraw/math'
import type { LocalPoint } from '@excalidraw/math'

export const TWO_PI = Math.PI * 2

export interface Box {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Snap an angle (given by dx, dy) to the nearest 15-degree increment.
 * Returns the snapped displacement as a GlobalPoint.
 */
export function snapAngle(dx: number, dy: number): { dx: number; dy: number } {
  const angle = Math.atan2(dy, dx)
  const snapped = Math.round(angle / (Math.PI / 12)) * (Math.PI / 12)
  const length = Math.hypot(dx, dy)
  return { dx: Math.cos(snapped) * length, dy: Math.sin(snapped) * length }
}

/**
 * Normalize points so that point[0] is always at (0, 0).
 * When point[0] moves, the element's x/y shifts accordingly
 * and all other points are offset to compensate.
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
 * Compute width/height from points array (for keeping element dimensions in sync).
 */
export function computeDimensionsFromPoints(points: readonly (readonly [number, number])[]): {
  width: number
  height: number
} {
  if (points.length === 0) return { width: 0, height: 0 }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const p of points) {
    if (p[0] < minX) minX = p[0]
    if (p[1] < minY) minY = p[1]
    if (p[0] > maxX) maxX = p[0]
    if (p[1] > maxY) maxY = p[1]
  }

  return { width: maxX - minX, height: maxY - minY }
}
