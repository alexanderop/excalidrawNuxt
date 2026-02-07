<script setup lang="ts">
import type { Ref, ShallowRef } from 'vue'
import { useElementSize } from '@vueuse/core'
import { useViewport } from '../composables/useViewport'
import { useRenderer } from '../composables/useRenderer'
import { usePanning } from '../composables/usePanning'

defineExpose({})

const containerRef = useTemplateRef<HTMLDivElement>('container')
const staticCanvasRef = useTemplateRef<HTMLCanvasElement>('staticCanvas')
const newElementCanvasRef = useTemplateRef<HTMLCanvasElement>('newElementCanvas')
const interactiveCanvasRef = useTemplateRef<HTMLCanvasElement>('interactiveCanvas')

const { width, height } = useElementSize(containerRef)

const { scrollX, scrollY, zoom, zoomBy, panBy } = useViewport()

const staticCtx = shallowRef<CanvasRenderingContext2D | null>(null)
const newElementCtx = shallowRef<CanvasRenderingContext2D | null>(null)
const interactiveCtx = shallowRef<CanvasRenderingContext2D | null>(null)

useRenderer({
  staticLayer: { ctx: staticCtx, canvas: staticCanvasRef },
  newElementLayer: { ctx: newElementCtx, canvas: newElementCanvasRef },
  interactiveLayer: { ctx: interactiveCtx, canvas: interactiveCanvasRef },
  width,
  height,
  scrollX,
  scrollY,
  zoom,
})

const { cursorClass } = usePanning({
  canvasRef: interactiveCanvasRef,
  panBy,
  zoomBy,
})

function initCanvasContext(
  canvasRef: Readonly<Ref<HTMLCanvasElement | null>>,
  ctxRef: ShallowRef<CanvasRenderingContext2D | null>,
): void {
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
