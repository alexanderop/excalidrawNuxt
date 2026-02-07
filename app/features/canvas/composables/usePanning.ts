import { ref, computed } from 'vue'
import type { Ref } from 'vue'
import { useEventListener } from '@vueuse/core'

interface UsePanningOptions {
  canvasRef: Readonly<Ref<HTMLCanvasElement | null>>
  panBy: (dx: number, dy: number) => void
  zoomBy: (delta: number, center: { x: number; y: number }) => void
}

export function usePanning({ canvasRef, panBy, zoomBy }: UsePanningOptions) {
  const spaceHeld = ref(false)
  const isPanning = ref(false)
  let lastPointerX = 0
  let lastPointerY = 0

  const cursorClass = computed<string>(() => {
    if (isPanning.value) return 'cursor-grabbing'
    if (spaceHeld.value) return 'cursor-grab'
    return 'cursor-default'
  })

  // Wheel: zoom (ctrl/meta + wheel) or pan (plain wheel)
  useEventListener(canvasRef, 'wheel', (e: WheelEvent) => {
    e.preventDefault()
    if (e.ctrlKey || e.metaKey) {
      const delta = -e.deltaY * 0.01
      zoomBy(delta, { x: e.offsetX, y: e.offsetY })
      return
    }
    panBy(-e.deltaX, -e.deltaY)
  }, { passive: false })

  // Space key: toggle grab cursor
  useEventListener(document, 'keydown', (e: KeyboardEvent) => {
    if (e.code !== 'Space') return
    if (spaceHeld.value) return
    const tag = (e.target instanceof HTMLElement) ? e.target.tagName : ''
    if (tag === 'INPUT' || tag === 'TEXTAREA') return
    e.preventDefault()
    spaceHeld.value = true
  })

  useEventListener(document, 'keyup', (e: KeyboardEvent) => {
    if (e.code !== 'Space') return
    spaceHeld.value = false
    isPanning.value = false
  })

  // Pointer drag while space held: pan the canvas
  useEventListener(canvasRef, 'pointerdown', (e: PointerEvent) => {
    if (!spaceHeld.value) return
    isPanning.value = true
    lastPointerX = e.clientX
    lastPointerY = e.clientY
    canvasRef.value?.setPointerCapture(e.pointerId)
  })

  useEventListener(canvasRef, 'pointermove', (e: PointerEvent) => {
    if (!isPanning.value) return
    const dx = e.clientX - lastPointerX
    const dy = e.clientY - lastPointerY
    lastPointerX = e.clientX
    lastPointerY = e.clientY
    panBy(dx, dy)
  })

  useEventListener(canvasRef, 'pointerup', (e: PointerEvent) => {
    if (!isPanning.value) return
    isPanning.value = false
    canvasRef.value?.releasePointerCapture(e.pointerId)
  })

  return { cursorClass }
}
