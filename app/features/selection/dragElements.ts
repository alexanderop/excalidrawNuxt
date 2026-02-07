import type { ExcalidrawElement } from '~/features/elements/types'
import { mutateElement } from '~/features/elements/mutateElement'
import type { Point } from '~/shared/math'

export interface DragState {
  /** Scene-space pointer position at drag start */
  origin: Point
  /** Snapshot of each selected element's position at drag start */
  originalPositions: Map<string, Point>
}

export function startDrag(
  scenePoint: Point,
  selectedElements: readonly ExcalidrawElement[],
): DragState {
  const originalPositions = new Map<string, Point>()
  for (const el of selectedElements) {
    originalPositions.set(el.id, { x: el.x, y: el.y })
  }
  return { origin: scenePoint, originalPositions }
}

export function continueDrag(
  scenePoint: Point,
  dragState: DragState,
  selectedElements: readonly ExcalidrawElement[],
): void {
  const dx = scenePoint.x - dragState.origin.x
  const dy = scenePoint.y - dragState.origin.y

  for (const el of selectedElements) {
    const original = dragState.originalPositions.get(el.id)
    if (!original) continue
    mutateElement(el, {
      x: original.x + dx,
      y: original.y + dy,
    })
  }
}

export function getConstrainedDelta(dx: number, dy: number): Point {
  if (Math.abs(dx) > Math.abs(dy)) {
    return { x: dx, y: 0 }
  }
  return { x: 0, y: dy }
}

export function hasMoved(dragState: DragState, scenePoint: Point): boolean {
  const dx = Math.abs(scenePoint.x - dragState.origin.x)
  const dy = Math.abs(scenePoint.y - dragState.origin.y)
  return dx > 0.5 || dy > 0.5
}
