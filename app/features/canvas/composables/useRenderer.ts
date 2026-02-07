import { ref, watch, toRaw, onScopeDispose } from 'vue'
import type { Ref, ShallowRef } from 'vue'
import { useDevicePixelRatio, useDocumentVisibility } from '@vueuse/core'

interface CanvasLayer {
  ctx: ShallowRef<CanvasRenderingContext2D | null>
  canvas: Readonly<Ref<HTMLCanvasElement | null>>
}

interface UseRendererOptions {
  staticLayer: CanvasLayer
  newElementLayer: CanvasLayer
  interactiveLayer: CanvasLayer
  width: Ref<number>
  height: Ref<number>
  scrollX: Ref<number>
  scrollY: Ref<number>
  zoom: Ref<number>
  onRenderStatic?: (ctx: CanvasRenderingContext2D) => void
  onRenderNewElement?: (ctx: CanvasRenderingContext2D) => void
  onRenderInteractive?: (ctx: CanvasRenderingContext2D) => void
}

interface UseRendererReturn {
  dpr: Ref<number>
  markStaticDirty: () => void
  markNewElementDirty: () => void
  markInteractiveDirty: () => void
  markAllDirty: () => void
}

function bootstrapCanvas(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  dpr: number,
  w: number,
  h: number,
  bgColor?: string,
): void {
  const targetWidth = w * dpr
  const targetHeight = h * dpr
  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth
    canvas.height = targetHeight
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.scale(dpr, dpr)

  if (bgColor) {
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, w, h)
    return
  }

  ctx.clearRect(0, 0, w, h)
}

function renderDirtyCanvas(
  dirty: Ref<boolean>,
  layer: CanvasLayer,
  currentDpr: number,
  w: number,
  h: number,
  bgColor?: string,
  onRender?: (ctx: CanvasRenderingContext2D) => void,
): void {
  if (!dirty.value) return
  const ctx = toRaw(layer.ctx.value)
  const canvas = toRaw(layer.canvas.value)
  if (!ctx || !canvas) return
  bootstrapCanvas(ctx, canvas, currentDpr, w, h, bgColor)
  onRender?.(ctx)
  dirty.value = false
}

export function useRenderer(options: UseRendererOptions): UseRendererReturn {
  const {
    staticLayer, newElementLayer, interactiveLayer,
    width, height, scrollX, scrollY, zoom,
    onRenderStatic, onRenderNewElement, onRenderInteractive,
  } = options

  const staticDirty = ref(true)
  const newElementDirty = ref(false)
  const interactiveDirty = ref(false)

  const { pixelRatio: dpr } = useDevicePixelRatio()
  const visibility = useDocumentVisibility()

  let rafId: number | null = null

  function scheduleRender(): void {
    if (rafId !== null) return
    if (visibility.value === 'hidden') return
    rafId = requestAnimationFrame(() => {
      rafId = null
      const w = width.value
      const h = height.value
      if (w === 0 || h === 0) return
      const currentDpr = dpr.value
      renderDirtyCanvas(staticDirty, staticLayer, currentDpr, w, h, '#ffffff', onRenderStatic)
      renderDirtyCanvas(newElementDirty, newElementLayer, currentDpr, w, h, undefined, onRenderNewElement)
      renderDirtyCanvas(interactiveDirty, interactiveLayer, currentDpr, w, h, undefined, onRenderInteractive)
    })
  }

  function markStaticDirty(): void {
    staticDirty.value = true
    scheduleRender()
  }
  function markNewElementDirty(): void {
    newElementDirty.value = true
    scheduleRender()
  }
  function markInteractiveDirty(): void {
    interactiveDirty.value = true
    scheduleRender()
  }
  function markAllDirty(): void {
    staticDirty.value = true
    newElementDirty.value = true
    interactiveDirty.value = true
    scheduleRender()
  }

  watch([width, height, scrollX, scrollY, zoom], markAllDirty)

  // Resume rendering when tab becomes visible again
  watch(visibility, (v) => {
    if (v === 'visible') markAllDirty()
  })

  onScopeDispose(() => {
    if (rafId !== null) cancelAnimationFrame(rafId)
  })

  return {
    dpr,
    markStaticDirty,
    markNewElementDirty,
    markInteractiveDirty,
    markAllDirty,
  }
}
