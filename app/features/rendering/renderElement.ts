import type { RoughCanvas } from 'roughjs/bin/canvas'
import type { ExcalidrawElement } from '~/features/elements/types'
import { generateShape } from './shapeGenerator'
import { renderArrowheads } from './arrowhead'

export function renderElement(
  ctx: CanvasRenderingContext2D,
  rc: RoughCanvas,
  element: ExcalidrawElement,
): void {
  if (element.isDeleted) return

  if (element.type === 'arrow' && element.points.length < 2) return
  if (element.type !== 'arrow' && element.width === 0 && element.height === 0) {
    return
  }

  ctx.save()
  ctx.translate(element.x, element.y)
  ctx.globalAlpha = element.opacity / 100

  const drawable = generateShape(element)
  rc.draw(drawable)

  if (element.type === 'arrow') {
    renderArrowheads(ctx, element)
  }

  ctx.restore()
}
