import type { Ref, ShallowRef } from 'vue'
import { useRafFn } from '@vueuse/core'

const GRID_SPACING = 20
const GRID_DOT_RADIUS = 1
const GRID_COLOR = '#ddd'
const GRID_FADE_ZOOM = 0.3

export function useRenderer(
  staticCtx: ShallowRef<CanvasRenderingContext2D | null>,
  newElementCtx: ShallowRef<CanvasRenderingContext2D | null>,
  interactiveCtx: ShallowRef<CanvasRenderingContext2D | null>,
  staticCanvas: Readonly<Ref<HTMLCanvasElement | null>>,
  newElementCanvas: Readonly<Ref<HTMLCanvasElement | null>>,
  interactiveCanvas: Readonly<Ref<HTMLCanvasElement | null>>,
  width: Ref<number>,
  height: Ref<number>,
  scrollX: Ref<number>,
  scrollY: Ref<number>,
  zoom: Ref<number>,
) {
  const staticDirty = ref(true)
  const newElementDirty = ref(false)
  const interactiveDirty = ref(false)

  const dpr = ref(1)

  onMounted(() => {
    dpr.value = window.devicePixelRatio || 1
  })

  function markStaticDirty() { staticDirty.value = true }
  function markNewElementDirty() { newElementDirty.value = true }
  function markInteractiveDirty() { interactiveDirty.value = true }
  function markAllDirty() {
    staticDirty.value = true
    newElementDirty.value = true
    interactiveDirty.value = true
  }

  watch([width, height, scrollX, scrollY, zoom], () => {
    markAllDirty()
  })

  function renderDirtyCanvas(
    dirty: Ref<boolean>,
    ctxRef: ShallowRef<CanvasRenderingContext2D | null>,
    canvasRef: Readonly<Ref<HTMLCanvasElement | null>>,
    currentDpr: number,
    w: number,
    h: number,
    afterBootstrap?: (ctx: CanvasRenderingContext2D) => void,
  ) {
    if (!dirty.value) return
    const ctx = toRaw(ctxRef.value)
    const canvas = toRaw(canvasRef.value)
    if (!ctx || !canvas) return
    bootstrapCanvas(ctx, canvas, currentDpr, w, h, afterBootstrap ? '#ffffff' : undefined)
    afterBootstrap?.(ctx)
    dirty.value = false
  }

  useRafFn(() => {
    const w = width.value
    const h = height.value
    if (w === 0 || h === 0) return

    const currentDpr = dpr.value

    renderDirtyCanvas(staticDirty, staticCtx, staticCanvas, currentDpr, w, h, (ctx) => {
      renderGrid(ctx, scrollX.value, scrollY.value, zoom.value, w, h)
    })
    renderDirtyCanvas(newElementDirty, newElementCtx, newElementCanvas, currentDpr, w, h)
    renderDirtyCanvas(interactiveDirty, interactiveCtx, interactiveCanvas, currentDpr, w, h)
  })

  return {
    dpr,
    markStaticDirty,
    markNewElementDirty,
    markInteractiveDirty,
    markAllDirty,
  }
}

function bootstrapCanvas(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  dpr: number,
  w: number,
  h: number,
  bgColor?: string,
) {
  canvas.width = w * dpr
  canvas.height = h * dpr
  canvas.style.width = `${w}px`
  canvas.style.height = `${h}px`

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.scale(dpr, dpr)

  if (bgColor) {
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, w, h)
    return
  }

  ctx.clearRect(0, 0, w, h)
}

function renderGrid(
  ctx: CanvasRenderingContext2D,
  scrollX: number,
  scrollY: number,
  zoom: number,
  w: number,
  h: number,
) {
  if (zoom < GRID_FADE_ZOOM) return

  const opacity = zoom < 0.5
    ? (zoom - GRID_FADE_ZOOM) / (0.5 - GRID_FADE_ZOOM)
    : 1

  ctx.save()
  ctx.globalAlpha = opacity

  ctx.scale(zoom, zoom)
  ctx.translate(scrollX, scrollY)

  const startX = Math.floor(-scrollX / GRID_SPACING) * GRID_SPACING
  const startY = Math.floor(-scrollY / GRID_SPACING) * GRID_SPACING
  const endX = startX + Math.ceil(w / (zoom * GRID_SPACING)) * GRID_SPACING + GRID_SPACING
  const endY = startY + Math.ceil(h / (zoom * GRID_SPACING)) * GRID_SPACING + GRID_SPACING

  ctx.fillStyle = GRID_COLOR

  for (let x = startX; x <= endX; x += GRID_SPACING) {
    for (let y = startY; y <= endY; y += GRID_SPACING) {
      ctx.beginPath()
      ctx.arc(x, y, GRID_DOT_RADIUS / zoom, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  ctx.restore()
}
