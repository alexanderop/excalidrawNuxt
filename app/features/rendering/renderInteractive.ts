import type { ExcalidrawElement } from '~/features/elements/types'
import {
  SELECTION_COLOR,
  SELECTION_LINE_WIDTH,
  SELECTION_PADDING,
  HANDLE_FILL,
  HANDLE_STROKE,
} from '~/features/selection/constants'
import { getTransformHandles } from '~/features/selection/transformHandles'
import type { TransformHandles } from '~/features/selection/transformHandles'

export function renderSelectionBorder(
  ctx: CanvasRenderingContext2D,
  element: ExcalidrawElement,
  zoom: number,
): void {
  const padding = SELECTION_PADDING / zoom
  const lineWidth = SELECTION_LINE_WIDTH / zoom

  ctx.save()
  ctx.strokeStyle = SELECTION_COLOR
  ctx.lineWidth = lineWidth
  ctx.setLineDash([8 / zoom, 4 / zoom])

  const cx = element.x + element.width / 2
  const cy = element.y + element.height / 2

  ctx.translate(cx, cy)
  ctx.rotate(element.angle)

  ctx.strokeRect(
    -element.width / 2 - padding,
    -element.height / 2 - padding,
    element.width + padding * 2,
    element.height + padding * 2,
  )

  ctx.restore()
}

export function renderTransformHandles(
  ctx: CanvasRenderingContext2D,
  handles: TransformHandles,
  zoom: number,
): void {
  const lineWidth = 1 / zoom
  const cornerRadius = 2 / zoom

  ctx.save()
  ctx.fillStyle = HANDLE_FILL
  ctx.strokeStyle = HANDLE_STROKE
  ctx.lineWidth = lineWidth
  ctx.setLineDash([])

  for (const [type, handle] of Object.entries(handles)) {
    if (!handle) continue
    const [x, y, w, h] = handle
    ctx.beginPath()
    if (type === 'rotation') {
      ctx.arc(x + w / 2, y + h / 2, w / 2, 0, Math.PI * 2)
    }

    if (type !== 'rotation') {
      ctx.roundRect(x, y, w, h, cornerRadius)
    }
    ctx.fill()
    ctx.stroke()
  }

  ctx.restore()
}

export function renderSelectionBox(
  ctx: CanvasRenderingContext2D,
  box: { x: number; y: number; width: number; height: number },
  zoom: number,
): void {
  ctx.save()
  ctx.fillStyle = 'rgba(74, 144, 217, 0.1)'
  ctx.strokeStyle = SELECTION_COLOR
  ctx.lineWidth = 1 / zoom
  ctx.setLineDash([])

  ctx.fillRect(box.x, box.y, box.width, box.height)
  ctx.strokeRect(box.x, box.y, box.width, box.height)
  ctx.restore()
}

export function renderInteractiveScene(
  ctx: CanvasRenderingContext2D,
  selectedElements: readonly ExcalidrawElement[],
  zoom: number,
  selectionBox: { x: number; y: number; width: number; height: number } | null,
): void {
  for (const el of selectedElements) {
    renderSelectionBorder(ctx, el, zoom)
    const handles = getTransformHandles(el, zoom)
    renderTransformHandles(ctx, handles, zoom)
  }

  if (selectionBox) {
    renderSelectionBox(ctx, selectionBox, zoom)
  }
}
