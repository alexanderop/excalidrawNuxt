import type { Point } from '~/shared/math'
import { rotatePoint } from '~/shared/math'
import type { ExcalidrawElement } from '~/features/elements/types'
import { distanceToSegment } from '~/features/selection/hitTest'
import { isBindableElement } from './types'
import type { BindableElement } from './types'
import { BASE_BINDING_DISTANCE, BASE_BINDING_GAP } from './constants'

interface BindingCandidate {
  element: BindableElement
  fixedPoint: readonly [number, number]
}

/**
 * Find the closest bindable shape within proximity threshold.
 * Returns the element and the normalized fixedPoint (0-1 ratio on bbox).
 */
export function getHoveredElementForBinding(
  point: Point,
  elements: readonly ExcalidrawElement[],
  zoom: number,
  excludeIds: ReadonlySet<string>,
): BindingCandidate | null {
  const threshold = BASE_BINDING_DISTANCE / zoom
  let closest: BindingCandidate | null = null
  let closestDist = Infinity

  for (const el of elements) {
    if (el.isDeleted) continue
    if (!isBindableElement(el)) continue
    if (excludeIds.has(el.id)) continue

    const dist = distanceToShapeEdge(point, el)
    if (dist <= threshold && dist < closestDist) {
      closestDist = dist
      closest = {
        element: el,
        fixedPoint: computeFixedPoint(point, el),
      }
    }
  }

  return closest
}

/**
 * Distance from a point to the nearest edge of a shape.
 * Handles rotation by unrotating the point around the shape center.
 */
export function distanceToShapeEdge(point: Point, element: BindableElement): number {
  const cx = element.x + element.width / 2
  const cy = element.y + element.height / 2
  const unrotated = element.angle === 0
    ? point
    : rotatePoint(point, { x: cx, y: cy }, -element.angle)

  if (element.type === 'rectangle') {
    return distanceToRectangleEdge(unrotated, element)
  }
  if (element.type === 'ellipse') {
    return distanceToEllipseEdge(unrotated, element)
  }
  if (element.type === 'diamond') {
    return distanceToDiamondEdge(unrotated, element)
  }

  const _exhaustive: never = element
  throw new Error(`Unhandled element type: ${String(_exhaustive)}`)
}

function distanceToRectangleEdge(point: Point, el: BindableElement): number {
  const { x, y, width, height } = el
  const edges: [Point, Point][] = [
    [{ x, y }, { x: x + width, y }],
    [{ x: x + width, y }, { x: x + width, y: y + height }],
    [{ x: x + width, y: y + height }, { x, y: y + height }],
    [{ x, y: y + height }, { x, y }],
  ]
  let minDist = Infinity
  for (const [a, b] of edges) {
    const d = distanceToSegment(point, a, b)
    if (d < minDist) minDist = d
  }
  return minDist
}

function distanceToEllipseEdge(point: Point, el: BindableElement): number {
  const cx = el.x + el.width / 2
  const cy = el.y + el.height / 2
  const rx = el.width / 2
  const ry = el.height / 2

  if (rx === 0 || ry === 0) return Math.hypot(point.x - cx, point.y - cy)

  // Approximate distance to ellipse boundary
  const dx = point.x - cx
  const dy = point.y - cy
  const angle = Math.atan2(dy, dx)
  const edgeX = cx + rx * Math.cos(angle)
  const edgeY = cy + ry * Math.sin(angle)
  return Math.hypot(point.x - edgeX, point.y - edgeY)
}

function distanceToDiamondEdge(point: Point, el: BindableElement): number {
  const cx = el.x + el.width / 2
  const cy = el.y + el.height / 2
  const vertices: Point[] = [
    { x: cx, y: el.y },
    { x: el.x + el.width, y: cy },
    { x: cx, y: el.y + el.height },
    { x: el.x, y: cy },
  ]
  let minDist = Infinity
  for (let i = 0; i < 4; i++) {
    const a = vertices[i]
    const b = vertices[(i + 1) % 4]
    if (!a || !b) continue
    const d = distanceToSegment(point, a, b)
    if (d < minDist) minDist = d
  }
  return minDist
}

/**
 * Compute the fixedPoint (0-1 ratio on shape bbox) for a given scene point.
 */
export function computeFixedPoint(point: Point, element: BindableElement): readonly [number, number] {
  const cx = element.x + element.width / 2
  const cy = element.y + element.height / 2
  const unrotated = element.angle === 0
    ? point
    : rotatePoint(point, { x: cx, y: cy }, -element.angle)

  const w = element.width || 1
  const h = element.height || 1
  const ratioX = (unrotated.x - element.x) / w
  const ratioY = (unrotated.y - element.y) / h

  return [
    Math.max(0, Math.min(1, ratioX)),
    Math.max(0, Math.min(1, ratioY)),
  ]
}

/**
 * Convert a fixedPoint back to scene coordinates.
 * Projects from center through fixedPoint onto shape edge,
 * then offsets outward by BASE_BINDING_GAP.
 */
export function getPointFromFixedPoint(
  fixedPoint: readonly [number, number],
  element: BindableElement,
): Point {
  const cx = element.x + element.width / 2
  const cy = element.y + element.height / 2

  // Fixed point in local (unrotated) space
  const targetX = element.x + fixedPoint[0] * element.width
  const targetY = element.y + fixedPoint[1] * element.height

  // Direction from center to target
  const dx = targetX - cx
  const dy = targetY - cy
  const len = Math.hypot(dx, dy)

  // Default to right edge if fixedPoint is exactly at center
  const edgePoint = len === 0
    ? projectOntoShapeEdge(cx, cy, 1, 0, element)
    : projectOntoShapeEdge(cx, cy, dx / len, dy / len, element)

  // Offset outward by gap
  const edgeDx = edgePoint.x - cx
  const edgeDy = edgePoint.y - cy
  const edgeLen = Math.hypot(edgeDx, edgeDy)
  const gap = BASE_BINDING_GAP
  const result: Point = edgeLen === 0
    ? edgePoint
    : {
        x: edgePoint.x + (edgeDx / edgeLen) * gap,
        y: edgePoint.y + (edgeDy / edgeLen) * gap,
      }

  // Re-rotate if element is rotated
  if (element.angle !== 0) {
    return rotatePoint(result, { x: cx, y: cy }, element.angle)
  }
  return result
}

/**
 * Project from center along a normalized direction onto the shape edge.
 */
function projectOntoShapeEdge(
  cx: number,
  cy: number,
  dirX: number,
  dirY: number,
  element: BindableElement,
): Point {
  if (element.type === 'rectangle') {
    return projectOntoRectEdge(cx, cy, dirX, dirY, element)
  }
  if (element.type === 'ellipse') {
    return projectOntoEllipseEdge(cx, cy, dirX, dirY, element)
  }
  if (element.type === 'diamond') {
    return projectOntoDiamondEdge(cx, cy, dirX, dirY, element)
  }

  const _exhaustive: never = element
  throw new Error(`Unhandled element type: ${String(_exhaustive)}`)
}

function projectOntoRectEdge(
  cx: number,
  cy: number,
  dirX: number,
  dirY: number,
  el: BindableElement,
): Point {
  const hw = el.width / 2
  const hh = el.height / 2

  // Find the intersection of ray from center with rect edges
  let t = Infinity
  if (dirX !== 0) {
    const tx = (dirX > 0 ? hw : -hw) / dirX
    if (tx > 0) t = Math.min(t, tx)
  }
  if (dirY !== 0) {
    const ty = (dirY > 0 ? hh : -hh) / dirY
    if (ty > 0) t = Math.min(t, ty)
  }

  if (!Number.isFinite(t)) return { x: cx, y: cy }

  return {
    x: cx + dirX * t,
    y: cy + dirY * t,
  }
}

function projectOntoEllipseEdge(
  cx: number,
  cy: number,
  dirX: number,
  dirY: number,
  el: BindableElement,
): Point {
  const rx = el.width / 2
  const ry = el.height / 2
  if (rx === 0 || ry === 0) return { x: cx, y: cy }

  // Parametric: point on ellipse at angle = (rx*cos, ry*sin)
  const angle = Math.atan2(dirY, dirX)
  return {
    x: cx + rx * Math.cos(angle),
    y: cy + ry * Math.sin(angle),
  }
}

function projectOntoDiamondEdge(
  cx: number,
  cy: number,
  dirX: number,
  dirY: number,
  el: BindableElement,
): Point {
  const hw = el.width / 2
  const hh = el.height / 2

  // Diamond vertices relative to center: top(0,-hh), right(hw,0), bottom(0,hh), left(-hw,0)
  const vertices: Point[] = [
    { x: 0, y: -hh },
    { x: hw, y: 0 },
    { x: 0, y: hh },
    { x: -hw, y: 0 },
  ]

  let closestT = Infinity
  for (let i = 0; i < 4; i++) {
    const a = vertices[i]
    const b = vertices[(i + 1) % 4]
    if (!a || !b) continue
    // Ray-segment intersection
    const t = raySegmentIntersection(dirX, dirY, a, b)
    if (t !== null && t > 0 && t < closestT) {
      closestT = t
    }
  }

  if (!Number.isFinite(closestT)) return { x: cx, y: cy }

  return {
    x: cx + dirX * closestT,
    y: cy + dirY * closestT,
  }
}

/**
 * Intersect ray (origin=0, dir) with segment (a, b).
 * Returns parameter t along ray, or null if no intersection.
 */
function raySegmentIntersection(
  dirX: number,
  dirY: number,
  a: Point,
  b: Point,
): number | null {
  const edgeX = b.x - a.x
  const edgeY = b.y - a.y
  const denom = dirX * edgeY - dirY * edgeX

  if (Math.abs(denom) < 1e-10) return null

  const t = (a.x * edgeY - a.y * edgeX) / denom
  const u = (a.x * dirY - a.y * dirX) / denom

  if (u >= 0 && u <= 1 && t > 0) return t
  return null
}
