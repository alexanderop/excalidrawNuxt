import type { ExcalidrawArrowElement } from '~/features/elements/types'
import type { GlobalPoint } from '@excalidraw/math'
import type { Theme } from '~/features/theme/types'
import { getPointPositions, getMidpointPositions } from './pointHandles'
import {
  POINT_HANDLE_RADIUS,
  MIDPOINT_HANDLE_RADIUS,
  LINEAR_EDITOR_COLORS,
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
  cursorPoint: GlobalPoint,
  zoom: number,
  theme: Theme,
): void {
  const lastPt = element.points.at(-1)
  if (!lastPt) return

  const sceneX = lastPt[0] + element.x
  const sceneY = lastPt[1] + element.y
  const colors = LINEAR_EDITOR_COLORS[theme]

  ctx.save()
  ctx.strokeStyle = colors.rubberBand
  ctx.lineWidth = RUBBER_BAND_WIDTH / zoom
  ctx.setLineDash(RUBBER_BAND_DASH.map(d => d / zoom))

  ctx.beginPath()
  ctx.moveTo(sceneX, sceneY)
  ctx.lineTo(cursorPoint[0], cursorPoint[1])
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
  theme: Theme,
): void {
  const positions = getPointPositions(element)
  const radius = POINT_HANDLE_RADIUS / zoom
  const lineWidth = 1.5 / zoom
  const colors = LINEAR_EDITOR_COLORS[theme]

  ctx.save()
  ctx.lineWidth = lineWidth

  for (const [i, pos] of positions.entries()) {
    ctx.beginPath()
    ctx.arc(pos[0], pos[1], radius, 0, Math.PI * 2)
    ctx.fillStyle = selectedIndices.has(i) ? colors.pointSelectedFill : colors.pointFill
    ctx.strokeStyle = colors.pointStroke
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
  theme: Theme,
): void {
  const midpoints = getMidpointPositions(element)
  const midpoint = midpoints[hoveredSegmentIndex]
  if (!midpoint) return

  const radius = MIDPOINT_HANDLE_RADIUS / zoom
  const lineWidth = 1 / zoom
  const colors = LINEAR_EDITOR_COLORS[theme]

  ctx.save()
  ctx.lineWidth = lineWidth
  ctx.fillStyle = colors.midpointFill
  ctx.strokeStyle = colors.midpointStroke

  ctx.beginPath()
  ctx.arc(midpoint[0], midpoint[1], radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.restore()
}
