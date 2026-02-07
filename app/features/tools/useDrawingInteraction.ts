import { shallowRef } from 'vue'
import type { Ref, ShallowRef } from 'vue'
import { useEventListener } from '@vueuse/core'
import type { ExcalidrawElement } from '~/features/elements/types'
import { createElement } from '~/features/elements/createElement'
import { mutateElement } from '~/features/elements/mutateElement'
import { createPoint, snapAngle } from '~/shared/math'
import type { ToolType } from './types'
import { isDrawingTool, isLinearTool } from './types'

interface UseDrawingInteractionOptions {
  canvasRef: Readonly<Ref<HTMLCanvasElement | null>>
  activeTool: ShallowRef<ToolType>
  spaceHeld: Ref<boolean>
  isPanning: Ref<boolean>
  toScene: (screenX: number, screenY: number) => { x: number; y: number }
  onElementCreated: (element: ExcalidrawElement) => void
  markNewElementDirty: () => void
  markStaticDirty: () => void
  newElement?: ShallowRef<ExcalidrawElement | null>
}

interface UseDrawingInteractionReturn {
  newElement: ShallowRef<ExcalidrawElement | null>
}

export function useDrawingInteraction(options: UseDrawingInteractionOptions): UseDrawingInteractionReturn {
  const {
    canvasRef,
    activeTool,
    spaceHeld,
    isPanning,
    toScene,
    onElementCreated,
    markNewElementDirty,
    markStaticDirty,
  } = options

  const newElement = options.newElement ?? shallowRef<ExcalidrawElement | null>(null)
  let originX = 0
  let originY = 0

  useEventListener(canvasRef, 'pointerdown', (e: PointerEvent) => {
    if (spaceHeld.value || isPanning.value) return
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

  useEventListener(canvasRef, 'pointerup', (e: PointerEvent) => {
    const el = newElement.value
    if (!el) return

    canvasRef.value?.releasePointerCapture(e.pointerId)

    if (el.width > 1 || el.height > 1) {
      onElementCreated(el)
    }

    activeTool.value = 'selection'
    newElement.value = null
    markNewElementDirty()
    markStaticDirty()
  })

  return { newElement }
}
