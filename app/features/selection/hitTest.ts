import type { ExcalidrawElement, ExcalidrawArrowElement } from '~/features/elements/types'
import { clamp, rotatePoint } from '~/shared/math'
import type { Point } from '~/shared/math'
import { getElementBounds } from './bounds'

export function getHitThreshold(element: ExcalidrawElement, zoom: number): number {
  return Math.max(element.strokeWidth / 2 + 0.1, 10 / zoom)
}

export function hitTest(
  point: Point,
  element: ExcalidrawElement,
  zoom: number,
): boolean {
  if (element.isDeleted) return false

  const threshold = getHitThreshold(element, zoom)

  // Phase 1: fast bounding box reject
  const [x1, y1, x2, y2] = getElementBounds(element)
  if (
    point.x < x1 - threshold
    || point.x > x2 + threshold
    || point.y < y1 - threshold
    || point.y > y2 + threshold
  ) {
    return false
  }

  // Phase 2: precise shape test
  return hitTestShape(point, element, threshold)
}

function hitTestShape(point: Point, element: ExcalidrawElement, threshold: number): boolean {
  switch (element.type) {
    case 'arrow': { return hitTestArrow(point, element, threshold)
    }
    case 'rectangle': { return hitTestRectangle(point, element, threshold)
    }
    case 'ellipse': { return hitTestEllipse(point, element, threshold)
    }
    case 'diamond': { return hitTestDiamond(point, element, threshold)
    }
    case 'text': { return hitTestRectangle(point, element, threshold)
    }
  }
}

export function getElementAtPosition(
  scenePoint: Point,
  elements: readonly ExcalidrawElement[],
  zoom: number,
): ExcalidrawElement | null {
  // Iterate back-to-front (topmost = last in array)
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i]
    if (!el) continue
    if (el.isDeleted) continue
    if (hitTest(scenePoint, el, zoom)) return el
  }
  return null
}

function hitTestRectangle(point: Point, el: ExcalidrawElement, threshold: number): boolean {
  const cx = el.x + el.width / 2
  const cy = el.y + el.height / 2
  const rotated = rotatePoint(point, { x: cx, y: cy }, -el.angle)

  return (
    rotated.x >= el.x - threshold
    && rotated.x <= el.x + el.width + threshold
    && rotated.y >= el.y - threshold
    && rotated.y <= el.y + el.height + threshold
  )
}

function hitTestEllipse(point: Point, el: ExcalidrawElement, threshold: number): boolean {
  const cx = el.x + el.width / 2
  const cy = el.y + el.height / 2
  const rotated = rotatePoint(point, { x: cx, y: cy }, -el.angle)

  const rx = el.width / 2
  const ry = el.height / 2
  const dx = rotated.x - cx
  const dy = rotated.y - cy

  const outerRx = rx + threshold
  const outerRy = ry + threshold
  return (dx * dx) / (outerRx * outerRx) + (dy * dy) / (outerRy * outerRy) <= 1
}

function hitTestDiamond(point: Point, el: ExcalidrawElement, threshold: number): boolean {
  const cx = el.x + el.width / 2
  const cy = el.y + el.height / 2
  const rotated = rotatePoint(point, { x: cx, y: cy }, -el.angle)

  const vertices: Point[] = [
    { x: cx, y: el.y },
    { x: el.x + el.width, y: cy },
    { x: cx, y: el.y + el.height },
    { x: el.x, y: cy },
  ]

  return isPointInPolygon(rotated, vertices, threshold)
}

function isPointInPolygon(point: Point, vertices: Point[], threshold: number): boolean {
  if (isInsidePolygon(point, vertices)) return true
  return isPointNearPolygonOutline(point, vertices, threshold)
}

function isInsidePolygon(point: Point, vertices: Point[]): boolean {
  let inside = false
  const n = vertices.length
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const vi = vertices[i]
    const vj = vertices[j]
    if (!vi || !vj) continue

    const intersect = ((vi.y > point.y) !== (vj.y > point.y))
      && (point.x < (vj.x - vi.x) * (point.y - vi.y) / (vj.y - vi.y) + vi.x)
    if (intersect) inside = !inside
  }
  return inside
}

function isPointNearPolygonOutline(point: Point, vertices: Point[], threshold: number): boolean {
  const n = vertices.length
  for (let i = 0; i < n; i++) {
    const a = vertices[i]
    const b = vertices[(i + 1) % n]
    if (!a || !b) continue
    if (distanceToSegment(point, a, b) <= threshold) return true
  }
  return false
}

function hitTestArrow(point: Point, el: ExcalidrawArrowElement, threshold: number): boolean {
  const pts = el.points.map(p => ({ x: p.x + el.x, y: p.y + el.y }))
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]
    const b = pts[i + 1]
    if (!a || !b) continue
    if (distanceToSegment(point, a, b) <= threshold) return true
  }
  return false
}

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
