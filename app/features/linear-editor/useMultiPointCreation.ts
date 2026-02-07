import { shallowRef, triggerRef } from 'vue'
import type { Ref, ShallowRef } from 'vue'
import { useEventListener } from '@vueuse/core'
import type { ExcalidrawElement, ExcalidrawArrowElement } from '~/features/elements/types'
import { mutateElement } from '~/features/elements/mutateElement'
import { createPoint, snapAngle } from '~/shared/math'
import type { Point } from '~/shared/math'
import {
  getHoveredElementForBinding,
  bindArrowToElement,
  updateArrowEndpoint,
} from '~/features/binding'
import { computeDimensionsFromPoints } from './pointHandles'

interface UseMultiPointCreationOptions {
  canvasRef: Readonly<Ref<HTMLCanvasElement | null>>
  toScene: (screenX: number, screenY: number) => Point
  markStaticDirty: () => void
  markInteractiveDirty: () => void
  onFinalize: () => void
  elements: ShallowRef<readonly ExcalidrawElement[]>
  zoom: Ref<number>
  suggestedBindings: ShallowRef<readonly ExcalidrawElement[]>
}

interface UseMultiPointCreationReturn {
  multiElement: ShallowRef<ExcalidrawArrowElement | null>
  lastCursorPoint: ShallowRef<Point | null>
  startMultiPoint: (element: ExcalidrawArrowElement) => void
  finalizeMultiPoint: () => void
}

export function useMultiPointCreation(options: UseMultiPointCreationOptions): UseMultiPointCreationReturn {
  const {
    canvasRef,
    toScene,
    markStaticDirty,
    markInteractiveDirty,
    onFinalize,
    elements,
    zoom,
    suggestedBindings,
  } = options

  const multiElement = shallowRef<ExcalidrawArrowElement | null>(null)
  const lastCursorPoint = shallowRef<Point | null>(null)

  function startMultiPoint(element: ExcalidrawArrowElement): void {
    multiElement.value = element
    const lastPt = element.points.at(-1)!
    lastCursorPoint.value = {
      x: lastPt.x + element.x,
      y: lastPt.y + element.y,
    }
    markInteractiveDirty()
  }

  function finalizeMultiPoint(): void {
    const el = multiElement.value
    if (el) {
      // Bind end endpoint if near a shape
      const lastPt = el.points.at(-1)!
      const endScene = { x: el.x + lastPt.x, y: el.y + lastPt.y }
      const excludeIds = new Set([el.id])
      const candidate = getHoveredElementForBinding(endScene, elements.value, zoom.value, excludeIds)
      if (candidate) {
        bindArrowToElement(el, 'end', candidate.element, candidate.fixedPoint)
        updateArrowEndpoint(el, 'end', candidate.element)
      }
      suggestedBindings.value = []
    }

    multiElement.value = null
    lastCursorPoint.value = null
    onFinalize()
    markInteractiveDirty()
  }

  useEventListener(canvasRef, 'pointerdown', (e: PointerEvent) => {
    const el = multiElement.value
    if (!el) return
    if (e.button !== 0) return

    const scene = toScene(e.offsetX, e.offsetY)
    const lastPt = el.points.at(-1)!
    const lastSceneX = lastPt.x + el.x
    const lastSceneY = lastPt.y + el.y

    let dx = scene.x - lastSceneX
    let dy = scene.y - lastSceneY

    if (e.shiftKey) {
      const snapped = snapAngle(dx, dy)
      dx = snapped.x
      dy = snapped.y
    }

    const newRelativePoint = createPoint(lastPt.x + dx, lastPt.y + dy)
    const newPoints = [...el.points, newRelativePoint]
    const dims = computeDimensionsFromPoints(newPoints)

    mutateElement(el, {
      points: newPoints,
      width: dims.width,
      height: dims.height,
    })

    // Trigger reactivity since we're mutating the same object
    triggerRef(multiElement)
    markStaticDirty()
    markInteractiveDirty()
  })

  useEventListener(canvasRef, 'pointermove', (e: PointerEvent) => {
    if (!multiElement.value) return

    const scene = toScene(e.offsetX, e.offsetY)
    lastCursorPoint.value = scene

    // Update suggested bindings based on cursor proximity
    const excludeIds = new Set([multiElement.value.id])
    const candidate = getHoveredElementForBinding(scene, elements.value, zoom.value, excludeIds)
    suggestedBindings.value = candidate ? [candidate.element] : []

    markInteractiveDirty()
  })

  useEventListener(canvasRef, 'dblclick', () => {
    if (!multiElement.value) return
    finalizeMultiPoint()
  })

  if (typeof document !== 'undefined') {
    useEventListener(document, 'keydown', (e: KeyboardEvent) => {
      if (!multiElement.value) return

      if (e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault()
        finalizeMultiPoint()
      }
    })
  }

  return {
    multiElement,
    lastCursorPoint,
    startMultiPoint,
    finalizeMultiPoint,
  }
}
