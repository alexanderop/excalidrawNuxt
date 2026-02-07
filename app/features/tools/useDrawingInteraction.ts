import { shallowRef } from 'vue'
import type { Ref, ShallowRef } from 'vue'
import { useEventListener } from '@vueuse/core'
import type { ExcalidrawElement, ExcalidrawArrowElement } from '~/features/elements/types'
import { createElement } from '~/features/elements/createElement'
import { mutateElement } from '~/features/elements/mutateElement'
import { createPoint, snapAngle } from '~/shared/math'
import {
  getHoveredElementForBinding,
  bindArrowToElement,
  updateArrowEndpoint,
  MINIMUM_ARROW_SIZE,
} from '~/features/binding'
import type { ToolType } from './types'
import { isDrawingTool, isLinearTool } from './types'

const _excludeIds = new Set<string>()

interface UseDrawingInteractionOptions {
  canvasRef: Readonly<Ref<HTMLCanvasElement | null>>
  activeTool: ShallowRef<ToolType>
  setTool: (tool: ToolType) => void
  spaceHeld: Ref<boolean>
  isPanning: Ref<boolean>
  toScene: (screenX: number, screenY: number) => { x: number; y: number }
  onElementCreated: (element: ExcalidrawElement) => void
  markNewElementDirty: () => void
  markStaticDirty: () => void
  markInteractiveDirty: () => void
  newElement?: ShallowRef<ExcalidrawElement | null>
  /** If set, skip pointerdown when multi-point mode is active */
  multiElement?: ShallowRef<ExcalidrawArrowElement | null>
  elements: ShallowRef<readonly ExcalidrawElement[]>
  zoom: Ref<number>
  suggestedBindings: ShallowRef<readonly ExcalidrawElement[]>
}

interface UseDrawingInteractionReturn {
  newElement: ShallowRef<ExcalidrawElement | null>
}

export function useDrawingInteraction(options: UseDrawingInteractionOptions): UseDrawingInteractionReturn {
  const {
    canvasRef,
    activeTool,
    setTool,
    spaceHeld,
    isPanning,
    toScene,
    onElementCreated,
    markNewElementDirty,
    markStaticDirty,
    markInteractiveDirty,
    multiElement,
    elements,
    zoom,
    suggestedBindings,
  } = options

  const newElement = options.newElement ?? shallowRef<ExcalidrawElement | null>(null)
  let originX = 0
  let originY = 0

  useEventListener(canvasRef, 'pointerdown', (e: PointerEvent) => {
    if (spaceHeld.value || isPanning.value) return
    if (multiElement?.value) return
    const tool = activeTool.value
    if (!isDrawingTool(tool)) return
    if (e.button !== 0) return

    const scene = toScene(e.offsetX, e.offsetY)
    originX = scene.x
    originY = scene.y

    newElement.value = createElement(tool, originX, originY)

    canvasRef.value?.setPointerCapture(e.pointerId)
  })

  useEventListener(canvasRef, 'pointermove', (e: PointerEvent) => {
    if (!newElement.value) return

    const scene = toScene(e.offsetX, e.offsetY)

    if (isLinearTool(activeTool.value)) {
      let dx = scene.x - originX
      let dy = scene.y - originY

      if (e.shiftKey) {
        const snapped = snapAngle(dx, dy)
        dx = snapped.x
        dy = snapped.y
      }

      const points = [createPoint(0, 0), createPoint(dx, dy)]

      mutateElement(newElement.value, {
        points,
        x: originX,
        y: originY,
        width: Math.abs(dx),
        height: Math.abs(dy),
      })

      // Update suggested bindings for arrow endpoints
      if (newElement.value.type === 'arrow') {
        _excludeIds.clear()
        _excludeIds.add(newElement.value.id)
        const endPoint = { x: originX + dx, y: originY + dy }
        const startPoint = { x: originX, y: originY }
        const candidates: ExcalidrawElement[] = []

        const startCandidate = getHoveredElementForBinding(startPoint, elements.value, zoom.value, _excludeIds)
        if (startCandidate) candidates.push(startCandidate.element)

        const endCandidate = getHoveredElementForBinding(endPoint, elements.value, zoom.value, _excludeIds)
        if (endCandidate) candidates.push(endCandidate.element)

        suggestedBindings.value = candidates
        markInteractiveDirty()
      }

      markNewElementDirty()
      return
    }

    let rawW = scene.x - originX
    let rawH = scene.y - originY

    if (e.shiftKey) {
      const side = Math.max(Math.abs(rawW), Math.abs(rawH))
      rawW = side * Math.sign(rawW || 1)
      rawH = side * Math.sign(rawH || 1)
    }

    const x = Math.min(originX, originX + rawW)
    const y = Math.min(originY, originY + rawH)
    const width = Math.abs(rawW)
    const height = Math.abs(rawH)

    mutateElement(newElement.value, { x, y, width, height })

    markNewElementDirty()
  })

  function tryBindArrowEndpoints(arrowEl: ExcalidrawArrowElement): void {
    _excludeIds.clear()
    _excludeIds.add(arrowEl.id)

    const startScenePoint = { x: arrowEl.x, y: arrowEl.y }
    const startCandidate = getHoveredElementForBinding(startScenePoint, elements.value, zoom.value, _excludeIds)
    if (startCandidate) {
      bindArrowToElement(arrowEl, 'start', startCandidate.element, startCandidate.fixedPoint)
      updateArrowEndpoint(arrowEl, 'start', startCandidate.element)
    }

    const lastPt = arrowEl.points.at(-1)
    if (!lastPt) return
    const endScenePoint = { x: arrowEl.x + lastPt.x, y: arrowEl.y + lastPt.y }
    const endCandidate = getHoveredElementForBinding(endScenePoint, elements.value, zoom.value, _excludeIds)
    if (endCandidate) {
      bindArrowToElement(arrowEl, 'end', endCandidate.element, endCandidate.fixedPoint)
      updateArrowEndpoint(arrowEl, 'end', endCandidate.element)
    }

    suggestedBindings.value = []
  }

  function isElementValid(el: ExcalidrawElement): boolean {
    if (el.type === 'arrow') {
      return Math.hypot(el.width, el.height) >= MINIMUM_ARROW_SIZE
    }
    return el.width > 1 || el.height > 1
  }

  useEventListener(canvasRef, 'pointerup', (e: PointerEvent) => {
    const el = newElement.value
    if (!el) return

    canvasRef.value?.releasePointerCapture(e.pointerId)

    if (isElementValid(el)) {
      onElementCreated(el)
      // Bind arrow endpoints to nearby shapes
      if (el.type === 'arrow') {
        tryBindArrowEndpoints(el)
      }
    }

    setTool('selection')
    newElement.value = null
    markNewElementDirty()
    markStaticDirty()
  })

  return { newElement }
}
