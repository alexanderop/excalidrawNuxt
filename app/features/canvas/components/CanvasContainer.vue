<script setup lang="ts">
import type { Ref, ShallowRef } from 'vue'
import { useElementSize, useEventListener } from '@vueuse/core'
import { useViewport } from '../composables/useViewport'
import { useRenderer } from '../composables/useRenderer'

defineExpose({})

const containerRef = useTemplateRef<HTMLDivElement>('container')
const staticCanvasRef = useTemplateRef<HTMLCanvasElement>('staticCanvas')
const newElementCanvasRef = useTemplateRef<HTMLCanvasElement>('newElementCanvas')
const interactiveCanvasRef = useTemplateRef<HTMLCanvasElement>('interactiveCanvas')

const { width, height } = useElementSize(containerRef)

const {
  scrollX,
  scrollY,
  zoom,
  zoomBy,
  panBy,
} = useViewport()

const staticCtx = shallowRef<CanvasRenderingContext2D | null>(null)
const newElementCtx = shallowRef<CanvasRenderingContext2D | null>(null)
const interactiveCtx = shallowRef<CanvasRenderingContext2D | null>(null)

useRenderer(
  staticCtx,
  newElementCtx,
  interactiveCtx,
  staticCanvasRef,
  newElementCanvasRef,
  interactiveCanvasRef,
  width,
  height,
  scrollX,
  scrollY,
  zoom,
)

function initCanvasContext(canvasRef: Readonly<Ref<HTMLCanvasElement | null>>, ctxRef: ShallowRef<CanvasRenderingContext2D | null>) {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (ctx) ctxRef.value = markRaw(ctx)
}

onMounted(() => {
  initCanvasContext(staticCanvasRef, staticCtx)
  initCanvasContext(newElementCanvasRef, newElementCtx)
  initCanvasContext(interactiveCanvasRef, interactiveCtx)
})

// --- Cursor state ---
const spaceHeld = ref(false)
const isPanning = ref(false)
let lastPointerX = 0
let lastPointerY = 0

const cursorClass = computed(() => {
  if (isPanning.value) return 'cursor-grabbing'
  if (spaceHeld.value) return 'cursor-grab'
  return 'cursor-default'
})

// --- Wheel: zoom or pan ---
useEventListener(interactiveCanvasRef, 'wheel', (e: WheelEvent) => {
  e.preventDefault()
  if (e.ctrlKey || e.metaKey) {
    const delta = -e.deltaY * 0.01
    zoomBy(delta, { x: e.offsetX, y: e.offsetY })
    return
  }
  panBy(-e.deltaX, -e.deltaY)
}, { passive: false })

// --- Space+drag pan ---
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

useEventListener(interactiveCanvasRef, 'pointerdown', (e: PointerEvent) => {
  if (!spaceHeld.value) return
  isPanning.value = true
  lastPointerX = e.clientX
  lastPointerY = e.clientY
  interactiveCanvasRef.value?.setPointerCapture(e.pointerId)
})

useEventListener(interactiveCanvasRef, 'pointermove', (e: PointerEvent) => {
  if (!isPanning.value) return
  const dx = e.clientX - lastPointerX
  const dy = e.clientY - lastPointerY
  lastPointerX = e.clientX
  lastPointerY = e.clientY
  panBy(dx, dy)
})

useEventListener(interactiveCanvasRef, 'pointerup', (e: PointerEvent) => {
  if (!isPanning.value) return
  isPanning.value = false
  interactiveCanvasRef.value?.releasePointerCapture(e.pointerId)
})
</script>

<template>
  <div
    ref="container"
    class="relative h-full w-full overflow-hidden"
    :class="cursorClass"
  >
    <canvas
      ref="staticCanvas"
      class="pointer-events-none absolute inset-0 z-[1]"
    />
    <canvas
      ref="newElementCanvas"
      class="pointer-events-none absolute inset-0 z-[1]"
    />
    <canvas
      ref="interactiveCanvas"
      class="absolute inset-0 z-[2]"
    />
  </div>
</template>
