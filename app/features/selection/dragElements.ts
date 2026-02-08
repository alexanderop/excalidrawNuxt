import type { ExcalidrawElement } from '~/features/elements/types'
import { mutateElement } from '~/features/elements/mutateElement'
import { pointFrom } from '@excalidraw/math'
import type { GlobalPoint } from '@excalidraw/math'

export interface DragState {
  /** Scene-space pointer position at drag start */
  origin: GlobalPoint
  /** Snapshot of each selected element's position at drag start */
  originalPositions: Map<string, GlobalPoint>
}

export function startDrag(
  scenePoint: GlobalPoint,
  selectedElements: readonly ExcalidrawElement[],
): DragState {
  const originalPositions = new Map<string, GlobalPoint>()
  for (const el of selectedElements) {
    originalPositions.set(el.id, pointFrom<GlobalPoint>(el.x, el.y))
  }
  return { origin: scenePoint, originalPositions }
}

export function continueDrag(
  scenePoint: GlobalPoint,
  dragState: DragState,
  selectedElements: readonly ExcalidrawElement[],
): void {
  const dx = scenePoint[0] - dragState.origin[0]
  const dy = scenePoint[1] - dragState.origin[1]

  for (const el of selectedElements) {
    const original = dragState.originalPositions.get(el.id)
    if (!original) continue
    mutateElement(el, {
      x: original[0] + dx,
      y: original[1] + dy,
    })
  }
}

export function getConstrainedDelta(dx: number, dy: number): GlobalPoint {
  if (Math.abs(dx) > Math.abs(dy)) {
    return pointFrom<GlobalPoint>(dx, 0)
  }
  return pointFrom<GlobalPoint>(0, dy)
}

export function hasMoved(dragState: DragState, scenePoint: GlobalPoint): boolean {
  const dx = Math.abs(scenePoint[0] - dragState.origin[0])
  const dy = Math.abs(scenePoint[1] - dragState.origin[1])
  return dx > 0.5 || dy > 0.5
}
