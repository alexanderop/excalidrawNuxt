import type { ExcalidrawElement, ExcalidrawArrowElement } from '~/features/elements/types'
import type { Box, Point } from '~/shared/math'
import {
  SELECTION_COLOR,
  SELECTION_LINE_WIDTH,
  SELECTION_PADDING,
  HANDLE_FILL,
  HANDLE_STROKE,
} from '~/features/selection/constants'
import { getTransformHandles } from '~/features/selection/transformHandles'
import type { TransformHandles } from '~/features/selection/transformHandles'
import {
  renderRubberBand,
  renderPointHandles,
  renderMidpointIndicator,
} from '~/features/linear-editor/renderLinearEditor'
import { renderSuggestedBinding } from '~/features/binding'

export interface LinearEditorRenderState {
  element: ExcalidrawArrowElement
  selectedPointIndices: ReadonlySet<number>
  hoveredMidpointIndex: number | null
}

export interface MultiPointRenderState {
  element: ExcalidrawArrowElement
  cursorPoint: Point
}

function applySelectionStroke(ctx: CanvasRenderingContext2D, zoom: number): void {
  ctx.strokeStyle = SELECTION_COLOR
  ctx.lineWidth = SELECTION_LINE_WIDTH / zoom
  ctx.setLineDash([8 / zoom, 4 / zoom])
}

function renderArrowSelectionBorder(
  ctx: CanvasRenderingContext2D,
  element: ExcalidrawArrowElement,
  zoom: number,
): void {
  const padding = SELECTION_PADDING / zoom
  const xs = element.points.map(p => p.x + element.x)
  const ys = element.points.map(p => p.y + element.y)
  const minX = Math.min(...xs) - padding
  const minY = Math.min(...ys) - padding
  const maxX = Math.max(...xs) + padding
  const maxY = Math.max(...ys) + padding

  ctx.save()
  applySelectionStroke(ctx, zoom)
  ctx.strokeRect(minX, minY, maxX - minX, maxY - minY)
  ctx.restore()
}

export function renderSelectionBorder(
  ctx: CanvasRenderingContext2D,
  element: ExcalidrawElement,
  zoom: number,
): void {
  if (element.type === 'arrow') {
    renderArrowSelectionBorder(ctx, element, zoom)
    return
  }

  const padding = SELECTION_PADDING / zoom

  ctx.save()
  applySelectionStroke(ctx, zoom)

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

function traceHandlePath(
  ctx: CanvasRenderingContext2D,
  type: string,
  x: number,
  y: number,
  w: number,
  h: number,
  cornerRadius: number,
): void {
  ctx.beginPath()
  if (type === 'rotation') {
    ctx.arc(x + w / 2, y + h / 2, w / 2, 0, Math.PI * 2)
    return
  }
  ctx.roundRect(x, y, w, h, cornerRadius)
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
    traceHandlePath(ctx, type, x, y, w, h, cornerRadius)
    ctx.fill()
    ctx.stroke()
  }

  ctx.restore()
}

export function renderSelectionBox(
  ctx: CanvasRenderingContext2D,
  box: Box,
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
  selectionBox: Box | null,
  linearEditorState?: LinearEditorRenderState | null,
  multiPointState?: MultiPointRenderState | null,
  suggestedBindings?: readonly ExcalidrawElement[] | null,
): void {
  // Render binding highlight before selection overlays
  if (suggestedBindings) {
    for (const el of suggestedBindings) {
      renderSuggestedBinding(ctx, el, zoom)
    }
  }

  for (const el of selectedElements) {
    // Skip selection border for element being edited in linear editor
    if (linearEditorState && el.id === linearEditorState.element.id) continue
    renderSelectionBorder(ctx, el, zoom)
    const handles = getTransformHandles(el, zoom)
    renderTransformHandles(ctx, handles, zoom)
  }

  if (selectionBox) {
    renderSelectionBox(ctx, selectionBox, zoom)
  }

  // Render linear editor overlays
  if (linearEditorState) {
    renderSelectionBorder(ctx, linearEditorState.element, zoom)
    renderPointHandles(ctx, linearEditorState.element, linearEditorState.selectedPointIndices, zoom)
    if (linearEditorState.hoveredMidpointIndex !== null) {
      renderMidpointIndicator(ctx, linearEditorState.element, linearEditorState.hoveredMidpointIndex, zoom)
    }
  }

  // Render multi-point creation overlays
  if (multiPointState) {
    renderRubberBand(ctx, multiPointState.element, multiPointState.cursorPoint, zoom)
  }
}
