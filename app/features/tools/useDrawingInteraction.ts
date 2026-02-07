import { shallowRef } from 'vue'
import type { Ref, ShallowRef } from 'vue'
import { useEventListener } from '@vueuse/core'
import type { ExcalidrawElement } from '~/features/elements/types'
import { createElement } from '~/features/elements/createElement'
import { mutateElement } from '~/features/elements/mutateElement'
import type { ToolType } from './types'
import { isDrawingTool } from './types'

interface UseDrawingInteractionOptions {
  canvasRef: Readonly<Ref<HTMLCanvasElement | null>>
  activeTool: ShallowRef<ToolType>
  spaceHeld: Ref<boolean>
  isPanning: Ref<boolean>
  toScene: (screenX: number, screenY: number) => { x: number; y: number }
  onElementCreated: (element: ExcalidrawElement) => void
  markNewElementDirty: () => void
  markStaticDirty: () => void
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

  const newElement = shallowRef<ExcalidrawElement | null>(null)
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
    let rawW = scene.x - originX
    let rawH = scene.y - originY

    if (e.shiftKey) {
      const side = Math.max(Math.abs(rawW), Math.abs(rawH))
      rawW = side * Math.sign(rawW || 1)
      rawH = side * Math.sign(rawH || 1)
    }

    let x = originX
    let width = rawW
    if (rawW < 0) {
      x = originX + rawW
      width = -rawW
    }

    let y = originY
    let height = rawH
    if (rawH < 0) {
      y = originY + rawH
      height = -rawH
    }

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
