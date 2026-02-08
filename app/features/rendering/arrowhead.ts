import type { ExcalidrawArrowElement, ArrowheadType } from '~/features/elements/types'
import type { Point } from '~/shared/math'
import type { Theme } from '~/features/theme'
import { resolveColor } from '~/features/theme'

export function renderArrowheads(
  ctx: CanvasRenderingContext2D,
  element: ExcalidrawArrowElement,
  theme: Theme,
): void {
  const { points, endArrowhead, startArrowhead, strokeWidth, strokeColor } = element
  if (points.length < 2) return

  const color = resolveColor(strokeColor, theme)

  if (endArrowhead && endArrowhead !== 'none') {
    const tip = points.at(-1)
    const prev = points.at(-2)
    if (!tip || !prev) return
    drawArrowhead(ctx, prev, tip, endArrowhead, strokeWidth, color)
  }

  if (startArrowhead && startArrowhead !== 'none') {
    const tip = points[0]
    const next = points[1]
    if (!tip || !next) return
    drawArrowhead(ctx, next, tip, startArrowhead, strokeWidth, color)
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

  switch (style) {
    case 'arrow': {
      ctx.beginPath()
      ctx.moveTo(wingLeftX, wingLeftY)
      ctx.lineTo(tip.x, tip.y)
      ctx.lineTo(wingRightX, wingRightY)
      ctx.stroke()
      break
    }
    case 'triangle': {
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.moveTo(tip.x, tip.y)
      ctx.lineTo(wingLeftX, wingLeftY)
      ctx.lineTo(wingRightX, wingRightY)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      break
    }
  }

  ctx.restore()
}
