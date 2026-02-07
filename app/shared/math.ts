export interface Point {
  x: number
  y: number
}

export interface Box {
  x: number
  y: number
  width: number
  height: number
}

export const TWO_PI = Math.PI * 2

export function createPoint(x: number, y: number): Point {
  return { x, y }
}

export function distanceSq(a: Point, b: Point): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return dx * dx + dy * dy
}

export function distance(a: Point, b: Point): number {
  return Math.sqrt(distanceSq(a, b))
}

export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min
  if (value > max) return max
  return value
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function lerpPoint(a: Point, b: Point, t: number): Point {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) }
}

export function angleBetween(a: Point, b: Point): number {
  return Math.atan2(b.y - a.y, b.x - a.x)
}

export function rotatePoint(point: Point, center: Point, angle: number): Point {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const dx = point.x - center.x
  const dy = point.y - center.y
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  }
}

export function snapAngle(dx: number, dy: number): Point {
  const angle = Math.atan2(dy, dx)
  const snapped = Math.round(angle / (Math.PI / 12)) * (Math.PI / 12)
  const length = Math.hypot(dx, dy)
  return { x: Math.cos(snapped) * length, y: Math.sin(snapped) * length }
}

/**
 * Distance from a point to a line segment defined by endpoints a and b.
 */
export function distanceToSegment(point: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSq = dx * dx + dy * dy

  if (lengthSq === 0) {
    return Math.hypot(point.x - a.x, point.y - a.y)
  }

  const t = clamp(((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSq, 0, 1)
  const closestX = a.x + t * dx
  const closestY = a.y + t * dy
  return Math.hypot(point.x - closestX, point.y - closestY)
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
