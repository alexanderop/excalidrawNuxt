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
import { getCommonBounds } from '~/features/selection/bounds'

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
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const p of element.points) {
    const px = p.x + element.x
    const py = p.y + element.y
    if (px < minX) minX = px
    if (py < minY) minY = py
    if (px > maxX) maxX = px
    if (py > maxY) maxY = py
  }
  minX -= padding
  minY -= padding
  maxX += padding
  maxY += padding

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

function renderGroupSelectionBorder(
  ctx: CanvasRenderingContext2D,
  groupElements: readonly ExcalidrawElement[],
  zoom: number,
): void {
  const bounds = getCommonBounds(groupElements)
  if (!bounds) return

  const [x1, y1, x2, y2] = bounds
  const padding = SELECTION_PADDING / zoom

  ctx.save()
  applySelectionStroke(ctx, zoom)
  ctx.strokeRect(
    x1 - padding,
    y1 - padding,
    x2 - x1 + 2 * padding,
    y2 - y1 + 2 * padding,
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

function isElementInSelectedGroup(
  element: ExcalidrawElement,
  selectedGroupIds: ReadonlySet<string> | undefined,
): boolean {
  if (!selectedGroupIds) return false
  return element.groupIds.some(gid => selectedGroupIds.has(gid))
}

function renderSelectedElements(
  ctx: CanvasRenderingContext2D,
  selectedElements: readonly ExcalidrawElement[],
  zoom: number,
  linearEditorState: LinearEditorRenderState | null | undefined,
  selectedGroupIds: ReadonlySet<string> | undefined,
): void {
  for (const el of selectedElements) {
    if (linearEditorState && el.id === linearEditorState.element.id) continue
    if (isElementInSelectedGroup(el, selectedGroupIds)) continue
    renderSelectionBorder(ctx, el, zoom)
    renderTransformHandles(ctx, getTransformHandles(el, zoom), zoom)
  }

  if (!selectedGroupIds || selectedGroupIds.size === 0) return
  for (const groupId of selectedGroupIds) {
    const groupElements = selectedElements.filter(el => el.groupIds.includes(groupId))
    renderGroupSelectionBorder(ctx, groupElements, zoom)
  }
}

function renderLinearEditorOverlays(
  ctx: CanvasRenderingContext2D,
  state: LinearEditorRenderState,
  zoom: number,
): void {
  renderSelectionBorder(ctx, state.element, zoom)
  renderPointHandles(ctx, state.element, state.selectedPointIndices, zoom)
  if (state.hoveredMidpointIndex !== null) {
    renderMidpointIndicator(ctx, state.element, state.hoveredMidpointIndex, zoom)
  }
}

export function renderInteractiveScene(
  ctx: CanvasRenderingContext2D,
  selectedElements: readonly ExcalidrawElement[],
  zoom: number,
  selectionBox: Box | null,
  linearEditorState?: LinearEditorRenderState | null,
  multiPointState?: MultiPointRenderState | null,
  suggestedBindings?: readonly ExcalidrawElement[] | null,
  selectedGroupIds?: ReadonlySet<string>,
): void {
  if (suggestedBindings) {
    for (const el of suggestedBindings) {
      renderSuggestedBinding(ctx, el, zoom)
    }
  }

  renderSelectedElements(ctx, selectedElements, zoom, linearEditorState, selectedGroupIds)

  if (selectionBox) {
    renderSelectionBox(ctx, selectionBox, zoom)
  }

  if (linearEditorState) {
    renderLinearEditorOverlays(ctx, linearEditorState, zoom)
  }

  if (multiPointState) {
    renderRubberBand(ctx, multiPointState.element, multiPointState.cursorPoint, zoom)
  }
}
