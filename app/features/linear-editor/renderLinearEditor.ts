import type { ExcalidrawArrowElement } from '~/features/elements/types'
import type { Point } from '~/shared/math'
import { getPointPositions, getMidpointPositions } from './pointHandles'
import {
  POINT_HANDLE_RADIUS,
  MIDPOINT_HANDLE_RADIUS,
  POINT_HANDLE_FILL,
  POINT_HANDLE_STROKE,
  POINT_HANDLE_SELECTED_FILL,
  MIDPOINT_HANDLE_FILL,
  MIDPOINT_HANDLE_STROKE,
  RUBBER_BAND_COLOR,
  RUBBER_BAND_DASH,
  RUBBER_BAND_WIDTH,
} from './constants'

/**
 * Render rubber-band preview line from the last point of a multi-point
 * arrow to the current cursor position.
 */
export function renderRubberBand(
  ctx: CanvasRenderingContext2D,
  element: ExcalidrawArrowElement,
  cursorPoint: Point,
  zoom: number,
): void {
  const lastPt = element.points.at(-1)
  if (!lastPt) return

  const sceneX = lastPt.x + element.x
  const sceneY = lastPt.y + element.y

  ctx.save()
  ctx.strokeStyle = RUBBER_BAND_COLOR
  ctx.lineWidth = RUBBER_BAND_WIDTH / zoom
  ctx.setLineDash(RUBBER_BAND_DASH.map(d => d / zoom))

  ctx.beginPath()
  ctx.moveTo(sceneX, sceneY)
  ctx.lineTo(cursorPoint.x, cursorPoint.y)
  ctx.stroke()

  ctx.restore()
}

/**
 * Render point handles (circles) at each vertex of an arrow element.
 * Selected points are filled with the selection color.
 */
export function renderPointHandles(
  ctx: CanvasRenderingContext2D,
  element: ExcalidrawArrowElement,
  selectedIndices: ReadonlySet<number>,
  zoom: number,
): void {
  const positions = getPointPositions(element)
  const radius = POINT_HANDLE_RADIUS / zoom
  const lineWidth = 1.5 / zoom

  ctx.save()
  ctx.lineWidth = lineWidth

  for (const [i, position] of positions.entries()) {
    const pos = position!
    const isSelected = selectedIndices.has(i)

    ctx.beginPath()
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2)
    ctx.fillStyle = isSelected ? POINT_HANDLE_SELECTED_FILL : POINT_HANDLE_FILL
    ctx.strokeStyle = POINT_HANDLE_STROKE
    ctx.fill()
    ctx.stroke()
  }

  ctx.restore()
}

/**
 * Render midpoint indicators (smaller circles) on segments.
 * Only shows the hovered midpoint.
 */
export function renderMidpointIndicator(
  ctx: CanvasRenderingContext2D,
  element: ExcalidrawArrowElement,
  hoveredSegmentIndex: number,
  zoom: number,
): void {
  const midpoints = getMidpointPositions(element)
  const midpoint = midpoints[hoveredSegmentIndex]
  if (!midpoint) return

  const radius = MIDPOINT_HANDLE_RADIUS / zoom
  const lineWidth = 1 / zoom

  ctx.save()
  ctx.lineWidth = lineWidth
  ctx.fillStyle = MIDPOINT_HANDLE_FILL
  ctx.strokeStyle = MIDPOINT_HANDLE_STROKE

  ctx.beginPath()
  ctx.arc(midpoint.x, midpoint.y, radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.restore()
}
