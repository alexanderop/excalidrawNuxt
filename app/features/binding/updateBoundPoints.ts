import type { ExcalidrawElement, ExcalidrawArrowElement } from '~/features/elements/types'
import { mutateElement } from '~/features/elements/mutateElement'
import { normalizePoints, computeDimensionsFromPoints } from '~/features/linear-editor/pointHandles'
import { isBindableElement } from './types'
import type { BindableElement } from './types'
import { getPointFromFixedPoint } from './proximity'
import { findBindableElement } from './bindUnbind'

/**
 * Update all arrow endpoints bound to a shape.
 * Call this after moving or resizing a shape.
 */
export function updateBoundArrowEndpoints(
  shape: ExcalidrawElement,
  elements: readonly ExcalidrawElement[],
): void {
  if (!isBindableElement(shape)) return
  if (shape.boundElements.length === 0) return

  for (const bound of shape.boundElements) {
    const arrow = elements.find(el => el.id === bound.id)
    if (!arrow || arrow.type !== 'arrow') continue

    if (arrow.startBinding?.elementId === shape.id) {
      updateArrowEndpoint(arrow, 'start', shape)
    }
    if (arrow.endBinding?.elementId === shape.id) {
      updateArrowEndpoint(arrow, 'end', shape)
    }
  }
}

/**
 * Update a single arrow endpoint to snap to the bound shape's edge.
 */
export function updateArrowEndpoint(
  arrow: ExcalidrawArrowElement,
  endpoint: 'start' | 'end',
  target: BindableElement,
): void {
  const binding = endpoint === 'start' ? arrow.startBinding : arrow.endBinding
  if (!binding) return

  const scenePoint = getPointFromFixedPoint(binding.fixedPoint, target)
  const pointIndex = endpoint === 'start' ? 0 : arrow.points.length - 1
  const relativePoint = {
    x: scenePoint.x - arrow.x,
    y: scenePoint.y - arrow.y,
  }

  const newPoints = arrow.points.map((p, i) =>
    i === pointIndex ? relativePoint : p,
  )

  const normalized = normalizePoints(arrow.x, arrow.y, newPoints)
  const dims = computeDimensionsFromPoints(normalized.points)

  mutateElement(arrow, {
    x: normalized.x,
    y: normalized.y,
    points: normalized.points,
    width: dims.width,
    height: dims.height,
  })
}

/**
 * Update both endpoints of an arrow based on their bindings.
 */
export function updateArrowBindings(
  arrow: ExcalidrawArrowElement,
  elements: readonly ExcalidrawElement[],
): void {
  if (arrow.startBinding) {
    const target = findBindableElement(arrow.startBinding.elementId, elements)
    if (target) updateArrowEndpoint(arrow, 'start', target)
  }
  if (arrow.endBinding) {
    const target = findBindableElement(arrow.endBinding.elementId, elements)
    if (target) updateArrowEndpoint(arrow, 'end', target)
  }
}
