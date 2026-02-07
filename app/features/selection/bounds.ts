import type { ExcalidrawElement } from '~/features/elements/types'
import { rotatePoint } from '~/shared/math'
import type { Point } from '~/shared/math'

export type Bounds = [x1: number, y1: number, x2: number, y2: number]

export function getElementBounds(element: ExcalidrawElement): Bounds {
  const { x, y, width, height, angle } = element

  if (angle === 0) {
    return [x, y, x + width, y + height]
  }

  const cx = x + width / 2
  const cy = y + height / 2
  const center: Point = { x: cx, y: cy }

  const corners: Point[] = [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ]

  const rotated = corners.map(p => rotatePoint(p, center, angle))

  const xs = rotated.map(p => p.x)
  const ys = rotated.map(p => p.y)

  return [
    Math.min(...xs),
    Math.min(...ys),
    Math.max(...xs),
    Math.max(...ys),
  ]
}

export function getCommonBounds(elements: readonly ExcalidrawElement[]): Bounds | null {
  if (elements.length === 0) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const el of elements) {
    const [x1, y1, x2, y2] = getElementBounds(el)
    if (x1 < minX) minX = x1
    if (y1 < minY) minY = y1
    if (x2 > maxX) maxX = x2
    if (y2 > maxY) maxY = y2
  }

  return [minX, minY, maxX, maxY]
}
