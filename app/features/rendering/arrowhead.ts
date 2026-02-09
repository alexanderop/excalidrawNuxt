import type { ExcalidrawArrowElement, Arrowhead } from '~/features/elements/types'
import type { LocalPoint } from '~/shared/math'
import type { Theme } from '~/features/theme/types'
import { resolveColor } from '~/features/theme/colors'

export function renderArrowheads(
  ctx: CanvasRenderingContext2D,
  element: ExcalidrawArrowElement,
  theme: Theme,
): void {
  const { points, endArrowhead, startArrowhead, strokeWidth, strokeColor } = element
  if (points.length < 2) return

  const color = resolveColor(strokeColor, theme)

  if (endArrowhead !== null) {
    const tip = points.at(-1)
    const prev = points.at(-2)
    if (!tip || !prev) return
    drawArrowhead(ctx, prev, tip, endArrowhead, strokeWidth, color)
  }

  if (startArrowhead !== null) {
    const tip = points[0]
    const next = points[1]
    if (!tip || !next) return
    drawArrowhead(ctx, next, tip, startArrowhead, strokeWidth, color)
  }
}

function drawArrowhead(
  ctx: CanvasRenderingContext2D,
  from: LocalPoint,
  tip: LocalPoint,
  style: Arrowhead,
  strokeWidth: number,
  color: string,
): void {
  const angle = Math.atan2(tip[1] - from[1], tip[0] - from[0])
  const headLength = Math.max(10, strokeWidth * 4)
  const headAngle = Math.PI / 6

  const wingLeftX = tip[0] - headLength * Math.cos(angle - headAngle)
  const wingLeftY = tip[1] - headLength * Math.sin(angle - headAngle)
  const wingRightX = tip[0] - headLength * Math.cos(angle + headAngle)
  const wingRightY = tip[1] - headLength * Math.sin(angle + headAngle)

  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = strokeWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  switch (style) {
    case 'arrow': {
      ctx.beginPath()
      ctx.moveTo(wingLeftX, wingLeftY)
      ctx.lineTo(tip[0], tip[1])
      ctx.lineTo(wingRightX, wingRightY)
      ctx.stroke()
      break
    }
    case 'triangle': {
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.moveTo(tip[0], tip[1])
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
