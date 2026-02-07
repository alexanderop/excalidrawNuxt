import type { ExcalidrawElement } from '~/features/elements/types'
import { rotatePoint } from '~/shared/math'
import type { Point } from '~/shared/math'
import { getElementBounds } from './bounds'
import { HANDLE_SIZE, HANDLE_MARGIN, ROTATION_HANDLE_OFFSET } from './constants'

export type TransformHandleDirection = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se'
export type TransformHandleType = TransformHandleDirection | 'rotation'

/** [x, y, width, height] in scene coordinates */
export type TransformHandle = [x: number, y: number, width: number, height: number]
export type TransformHandles = Partial<Record<TransformHandleType, TransformHandle>>

const ALL_HANDLE_TYPES: readonly TransformHandleType[] = [
  'nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w', 'rotation',
]

export function getTransformHandles(
  element: ExcalidrawElement,
  zoom: number,
): TransformHandles {
  if (element.type === 'arrow') return {}

  const size = HANDLE_SIZE / zoom
  const margin = HANDLE_MARGIN / zoom
  const halfSize = size / 2

  const [x1, y1, x2, y2] = getElementBounds(element)
  const cx = (x1 + x2) / 2
  const cy = (y1 + y2) / 2
  const w = x2 - x1
  const h = y2 - y1

  const handles: TransformHandles = {
    nw: [x1 - margin - size, y1 - margin - size, size, size],
    ne: [x2 + margin, y1 - margin - size, size, size],
    sw: [x1 - margin - size, y2 + margin, size, size],
    se: [x2 + margin, y2 + margin, size, size],
  }

  // Side handles (only if element large enough: > 5 * handleSize)
  if (w > 5 * size) {
    handles.n = [cx - halfSize, y1 - margin - size, size, size]
    handles.s = [cx - halfSize, y2 + margin, size, size]
  }
  if (h > 5 * size) {
    handles.w = [x1 - margin - size, cy - halfSize, size, size]
    handles.e = [x2 + margin, cy - halfSize, size, size]
  }

  // Rotation handle (above element)
  const rotOffset = ROTATION_HANDLE_OFFSET / zoom
  handles.rotation = [cx - halfSize, y1 - margin - size - rotOffset, size, size]

  // Rotate all handle positions by element.angle around element center
  if (element.angle !== 0) {
    const elCx = element.x + element.width / 2
    const elCy = element.y + element.height / 2
    const center: Point = { x: elCx, y: elCy }

    for (const key of ALL_HANDLE_TYPES) {
      const handle = handles[key]
      if (!handle) continue
      const handleCenter: Point = {
        x: handle[0] + handle[2] / 2,
        y: handle[1] + handle[3] / 2,
      }
      const rotated = rotatePoint(handleCenter, center, element.angle)
      handles[key] = [
        rotated.x - handle[2] / 2,
        rotated.y - handle[3] / 2,
        handle[2],
        handle[3],
      ]
    }
  }

  return handles
}

export function getTransformHandleAtPosition(
  scenePoint: Point,
  element: ExcalidrawElement,
  zoom: number,
): TransformHandleType | null {
  if (element.type === 'arrow') return null

  const handles = getTransformHandles(element, zoom)

  for (const type of ALL_HANDLE_TYPES) {
    const handle = handles[type]
    if (!handle) continue
    const [hx, hy, hw, hh] = handle
    if (
      scenePoint.x >= hx && scenePoint.x <= hx + hw
      && scenePoint.y >= hy && scenePoint.y <= hy + hh
    ) {
      return type
    }
  }
  return null
}
