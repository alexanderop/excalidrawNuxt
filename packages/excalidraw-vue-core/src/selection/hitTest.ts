import type { ExcalidrawElement, ExcalidrawArrowElement } from '../elements/types'
import { clamp, pointFrom, pointRotateRads, radiansFrom } from '../math/index'
import type { GlobalPoint } from '../math/index'
import { getElementBounds } from './bounds'

export function getHitThreshold(element: ExcalidrawElement, zoom: number): number {
  return Math.max(element.strokeWidth / 2 + 0.1, 10 / zoom)
}

export function hitTest(
  point: GlobalPoint,
  element: ExcalidrawElement,
  zoom: number,
): boolean {
  if (element.isDeleted) return false

  const threshold = getHitThreshold(element, zoom)

  // Phase 1: fast bounding box reject
  const [x1, y1, x2, y2] = getElementBounds(element)
  if (
    point[0] < x1 - threshold
    || point[0] > x2 + threshold
    || point[1] < y1 - threshold
    || point[1] > y2 + threshold
  ) {
    return false
  }

  // Phase 2: precise shape test
  return hitTestShape(point, element, threshold)
}

function hitTestShape(point: GlobalPoint, element: ExcalidrawElement, threshold: number): boolean {
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
  scenePoint: GlobalPoint,
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

function hitTestRectangle(point: GlobalPoint, el: ExcalidrawElement, threshold: number): boolean {
  const cx = el.x + el.width / 2
  const cy = el.y + el.height / 2
  const rotated = pointRotateRads(point, pointFrom<GlobalPoint>(cx, cy), radiansFrom(-el.angle))

  return (
    rotated[0] >= el.x - threshold
    && rotated[0] <= el.x + el.width + threshold
    && rotated[1] >= el.y - threshold
    && rotated[1] <= el.y + el.height + threshold
  )
}

function hitTestEllipse(point: GlobalPoint, el: ExcalidrawElement, threshold: number): boolean {
  const cx = el.x + el.width / 2
  const cy = el.y + el.height / 2
  const rotated = pointRotateRads(point, pointFrom<GlobalPoint>(cx, cy), radiansFrom(-el.angle))

  const rx = el.width / 2
  const ry = el.height / 2
  const dx = rotated[0] - cx
  const dy = rotated[1] - cy

  const outerRx = rx + threshold
  const outerRy = ry + threshold
  return (dx * dx) / (outerRx * outerRx) + (dy * dy) / (outerRy * outerRy) <= 1
}

function hitTestDiamond(point: GlobalPoint, el: ExcalidrawElement, threshold: number): boolean {
  const cx = el.x + el.width / 2
  const cy = el.y + el.height / 2
  const rotated = pointRotateRads(point, pointFrom<GlobalPoint>(cx, cy), radiansFrom(-el.angle))

  const vertices: GlobalPoint[] = [
    pointFrom<GlobalPoint>(cx, el.y),
    pointFrom<GlobalPoint>(el.x + el.width, cy),
    pointFrom<GlobalPoint>(cx, el.y + el.height),
    pointFrom<GlobalPoint>(el.x, cy),
  ]

  return isPointInPolygon(rotated, vertices, threshold)
}

function isPointInPolygon(point: GlobalPoint, vertices: GlobalPoint[], threshold: number): boolean {
  if (isInsidePolygon(point, vertices)) return true
  return isPointNearPolygonOutline(point, vertices, threshold)
}

function isInsidePolygon(point: GlobalPoint, vertices: GlobalPoint[]): boolean {
  let inside = false
  const n = vertices.length
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const vi = vertices[i]
    const vj = vertices[j]
    if (!vi || !vj) continue

    const intersect = ((vi[1] > point[1]) !== (vj[1] > point[1]))
      && (point[0] < (vj[0] - vi[0]) * (point[1] - vi[1]) / (vj[1] - vi[1]) + vi[0])
    if (intersect) inside = !inside
  }
  return inside
}

function isPointNearPolygonOutline(point: GlobalPoint, vertices: GlobalPoint[], threshold: number): boolean {
  const n = vertices.length
  for (let i = 0; i < n; i++) {
    const a = vertices[i]
    const b = vertices[(i + 1) % n]
    if (!a || !b) continue
    if (distanceToSegment(point, a, b) <= threshold) return true
  }
  return false
}

function hitTestArrow(point: GlobalPoint, el: ExcalidrawArrowElement, threshold: number): boolean {
  const pts = el.points.map(p => pointFrom<GlobalPoint>(p[0] + el.x, p[1] + el.y))
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]
    const b = pts[i + 1]
    if (!a || !b) continue
    if (distanceToSegment(point, a, b) <= threshold) return true
  }
  return false
}

export function distanceToSegment(point: GlobalPoint, a: GlobalPoint, b: GlobalPoint): number {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const lengthSq = dx * dx + dy * dy

  if (lengthSq === 0) {
    return Math.hypot(point[0] - a[0], point[1] - a[1])
  }

  const t = clamp(((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / lengthSq, 0, 1)
  const closestX = a[0] + t * dx
  const closestY = a[1] + t * dy
  return Math.hypot(point[0] - closestX, point[1] - closestY)
}
