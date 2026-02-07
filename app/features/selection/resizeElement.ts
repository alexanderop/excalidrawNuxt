import type { ExcalidrawElement } from '~/features/elements/types'
import { mutateElement } from '~/features/elements/mutateElement'
import { rotatePoint } from '~/shared/math'
import type { Box, Point } from '~/shared/math'
import { MIN_ELEMENT_SIZE } from './constants'
import type { TransformHandleDirection } from './transformHandles'

export interface ResizeState {
  handleType: TransformHandleDirection
  /** Original element bounds at resize start */
  originalBounds: Box
  /** Scene-space pointer position at resize start */
  origin: Point
}

export function resizeElement(
  scenePoint: Point,
  resizeState: ResizeState,
  element: ExcalidrawElement,
  shiftKey: boolean,
): void {
  const { handleType, originalBounds: ob, origin } = resizeState

  // Work in unrotated coordinate space
  const center: Point = { x: ob.x + ob.width / 2, y: ob.y + ob.height / 2 }
  const unrotatedPointer = rotatePoint(scenePoint, center, -element.angle)
  const unrotatedOrigin = rotatePoint(origin, center, -element.angle)
  const dx = unrotatedPointer.x - unrotatedOrigin.x
  const dy = unrotatedPointer.y - unrotatedOrigin.y

  let { x, y, width, height } = applyHandleDelta(ob, handleType, dx, dy)

  if (shiftKey && ob.height !== 0) {
    ({ width, height } = applyAspectRatio(ob, handleType, width, height))
  }

  // Enforce minimum size
  if (Math.abs(width) < MIN_ELEMENT_SIZE) width = (Math.sign(width) || 1) * MIN_ELEMENT_SIZE
  if (Math.abs(height) < MIN_ELEMENT_SIZE) height = (Math.sign(height) || 1) * MIN_ELEMENT_SIZE

  // Handle negative dimensions (dragging past opposite edge)
  if (width < 0) { x += width; width = Math.abs(width) }
  if (height < 0) { y += height; height = Math.abs(height) }

  mutateElement(element, { x, y, width, height })
}

function applyHandleDelta(
  ob: Box,
  handleType: TransformHandleDirection,
  dx: number,
  dy: number,
): Box {
  let x = ob.x
  let y = ob.y
  let width = ob.width
  let height = ob.height

  if (handleType.includes('e')) { width += dx }
  if (handleType.includes('w')) { x += dx; width -= dx }
  if (handleType.includes('s')) { height += dy }
  if (handleType.includes('n')) { y += dy; height -= dy }

  return { x, y, width, height }
}

function applyAspectRatio(
  ob: { width: number; height: number },
  handleType: TransformHandleDirection,
  width: number,
  height: number,
): { width: number; height: number } {
  const aspectRatio = ob.width / ob.height
  const isSideVertical = handleType === 'n' || handleType === 's'
  const isSideHorizontal = handleType === 'e' || handleType === 'w'

  if (isSideVertical) return { width: height * aspectRatio, height }
  if (isSideHorizontal) return { width, height: width / aspectRatio }

  // Corner: use the dominant axis
  const newAspect = Math.abs(width) / Math.abs(height)
  if (newAspect > aspectRatio) {
    return { width, height: Math.sign(height) * Math.abs(width) / aspectRatio }
  }
  return { width: Math.sign(width) * Math.abs(height) * aspectRatio, height }
}
