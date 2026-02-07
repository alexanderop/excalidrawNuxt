import type { RoughCanvas } from 'roughjs/bin/canvas'
import type { ExcalidrawElement } from '~/features/elements/types'
import { renderElement } from './renderElement'

export function renderScene(
  ctx: CanvasRenderingContext2D,
  rc: RoughCanvas,
  elements: readonly ExcalidrawElement[],
  scrollX: number,
  scrollY: number,
  zoom: number,
): void {
  ctx.save()
  ctx.scale(zoom, zoom)
  ctx.translate(scrollX, scrollY)

  for (const element of elements) {
    renderElement(ctx, rc, element)
  }

  ctx.restore()
}
