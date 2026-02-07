<script setup lang="ts">
import { shallowRef, markRaw, onMounted, useTemplateRef } from 'vue'
import type { Ref, ShallowRef } from 'vue'
import { useElementSize } from '@vueuse/core'
import rough from 'roughjs'
import type { RoughCanvas } from 'roughjs/bin/canvas'
import { useViewport } from '../composables/useViewport'
import { useRenderer } from '../composables/useRenderer'
import { usePanning } from '../composables/usePanning'
import { useElements } from '~/features/elements/useElements'
import { useTool } from '~/features/tools/useTool'
import { useDrawingInteraction } from '~/features/tools/useDrawingInteraction'
import { renderGrid } from '~/features/rendering/renderGrid'
import { renderScene } from '~/features/rendering/renderScene'
import { renderElement } from '~/features/rendering/renderElement'
import DrawingToolbar from '~/features/tools/components/DrawingToolbar.vue'

defineExpose({})

const containerRef = useTemplateRef<HTMLDivElement>('container')
const staticCanvasRef = useTemplateRef<HTMLCanvasElement>('staticCanvas')
const newElementCanvasRef = useTemplateRef<HTMLCanvasElement>('newElementCanvas')
const interactiveCanvasRef = useTemplateRef<HTMLCanvasElement>('interactiveCanvas')

const { width, height } = useElementSize(containerRef)

const { scrollX, scrollY, zoom, zoomBy, panBy, toScene } = useViewport()
const { elements, addElement } = useElements()
const { activeTool, setTool } = useTool()

const staticCtx = shallowRef<CanvasRenderingContext2D | null>(null)
const newElementCtx = shallowRef<CanvasRenderingContext2D | null>(null)
const interactiveCtx = shallowRef<CanvasRenderingContext2D | null>(null)

const staticRc = shallowRef<RoughCanvas | null>(null)
const newElementRc = shallowRef<RoughCanvas | null>(null)

const { markStaticDirty, markNewElementDirty } = useRenderer({
  staticLayer: { ctx: staticCtx, canvas: staticCanvasRef },
  newElementLayer: { ctx: newElementCtx, canvas: newElementCanvasRef },
  interactiveLayer: { ctx: interactiveCtx, canvas: interactiveCanvasRef },
  width,
  height,
  scrollX,
  scrollY,
  zoom,
  onRenderStatic(ctx) {
    renderGrid(ctx, scrollX.value, scrollY.value, zoom.value, width.value, height.value)
    const rc = staticRc.value
    if (rc) {
      renderScene(ctx, rc, elements.value, scrollX.value, scrollY.value, zoom.value)
    }
  },
  onRenderNewElement(ctx) {
    const el = newElement.value
    const rc = newElementRc.value
    if (!el || !rc) return
    ctx.save()
    ctx.scale(zoom.value, zoom.value)
    ctx.translate(scrollX.value, scrollY.value)
    renderElement(ctx, rc, el)
    ctx.restore()
  },
})

const { cursorClass, spaceHeld, isPanning } = usePanning({
  canvasRef: interactiveCanvasRef,
  panBy,
  zoomBy,
  activeTool,
})

const { newElement } = useDrawingInteraction({
  canvasRef: interactiveCanvasRef,
  activeTool,
  spaceHeld,
  isPanning,
  toScene,
  onElementCreated: addElement,
  markNewElementDirty,
  markStaticDirty,
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

function initRoughCanvas(
  canvasRef: Readonly<Ref<HTMLCanvasElement | null>>,
  rcRef: ShallowRef<RoughCanvas | null>,
): void {
  const canvas = canvasRef.value
  if (!canvas) return
  rcRef.value = markRaw(rough.canvas(canvas))
}

onMounted(() => {
  initCanvasContext(staticCanvasRef, staticCtx)
  initCanvasContext(newElementCanvasRef, newElementCtx)
  initCanvasContext(interactiveCanvasRef, interactiveCtx)

  initRoughCanvas(staticCanvasRef, staticRc)
  initRoughCanvas(newElementCanvasRef, newElementRc)
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
    <DrawingToolbar
      :active-tool="activeTool"
      :on-set-tool="setTool"
    />
  </div>
</template>
