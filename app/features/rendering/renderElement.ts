import type { RoughCanvas } from 'roughjs/bin/canvas'
import type { ExcalidrawElement } from '~/features/elements/types'
import { generateShape } from './shapeGenerator'

export function renderElement(
  ctx: CanvasRenderingContext2D,
  rc: RoughCanvas,
  element: ExcalidrawElement,
): void {
  if (element.isDeleted) return
  if (element.width === 0 && element.height === 0) return

  ctx.save()
  ctx.translate(element.x, element.y)
  ctx.globalAlpha = element.opacity / 100

  const drawable = generateShape(element)
  rc.draw(drawable)

  ctx.restore()
}
