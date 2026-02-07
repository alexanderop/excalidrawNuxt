import type { ExcalidrawArrowElement, ArrowheadType } from '~/features/elements/types'
import type { Point } from '~/shared/math'

export function renderArrowheads(
  ctx: CanvasRenderingContext2D,
  element: ExcalidrawArrowElement,
): void {
  const { points, endArrowhead, startArrowhead, strokeWidth, strokeColor } = element
  if (points.length < 2) return

  if (endArrowhead && endArrowhead !== 'none') {
    const tip = points.at(-1)
    const prev = points.at(-2)
    if (!tip || !prev) return
    drawArrowhead(ctx, prev, tip, endArrowhead, strokeWidth, strokeColor)
  }

  if (startArrowhead && startArrowhead !== 'none') {
    const tip = points[0]
    const next = points[1]
    if (!tip || !next) return
    drawArrowhead(ctx, next, tip, startArrowhead, strokeWidth, strokeColor)
  }
}

function drawArrowhead(
  ctx: CanvasRenderingContext2D,
  from: Point,
  tip: Point,
  style: ArrowheadType,
  strokeWidth: number,
  color: string,
): void {
  const angle = Math.atan2(tip.y - from.y, tip.x - from.x)
  const headLength = Math.max(10, strokeWidth * 4)
  const headAngle = Math.PI / 6

  const wingLeftX = tip.x - headLength * Math.cos(angle - headAngle)
  const wingLeftY = tip.y - headLength * Math.sin(angle - headAngle)
  const wingRightX = tip.x - headLength * Math.cos(angle + headAngle)
  const wingRightY = tip.y - headLength * Math.sin(angle + headAngle)

  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = strokeWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  if (style === 'arrow') {
    ctx.beginPath()
    ctx.moveTo(wingLeftX, wingLeftY)
    ctx.lineTo(tip.x, tip.y)
    ctx.lineTo(wingRightX, wingRightY)
    ctx.stroke()
  }

  if (style === 'triangle') {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(tip.x, tip.y)
    ctx.lineTo(wingLeftX, wingLeftY)
    ctx.lineTo(wingRightX, wingRightY)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }

  ctx.restore()
}
