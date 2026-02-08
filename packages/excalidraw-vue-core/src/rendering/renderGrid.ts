import type { Theme } from '../theme/types'
import { resolveColor } from '../theme/colors'

const TWO_PI = Math.PI * 2

export const GRID_SPACING = 20
const GRID_DOT_RADIUS = 1
const GRID_FADE_ZOOM = 0.3
const GRID_DOT_COLOR = '#ddd'

export function renderGrid(
  ctx: CanvasRenderingContext2D,
  scrollX: number,
  scrollY: number,
  zoom: number,
  w: number,
  h: number,
  theme: Theme,
): void {
  if (zoom < GRID_FADE_ZOOM) return

  const opacity = zoom < 0.5
    ? (zoom - GRID_FADE_ZOOM) / (0.5 - GRID_FADE_ZOOM)
    : 1

  ctx.save()
  ctx.globalAlpha = opacity

  ctx.scale(zoom, zoom)
  ctx.translate(scrollX, scrollY)

  const startX = Math.floor(-scrollX / GRID_SPACING) * GRID_SPACING
  const startY = Math.floor(-scrollY / GRID_SPACING) * GRID_SPACING
  const endX = startX + Math.ceil(w / (zoom * GRID_SPACING)) * GRID_SPACING + GRID_SPACING
  const endY = startY + Math.ceil(h / (zoom * GRID_SPACING)) * GRID_SPACING + GRID_SPACING

  ctx.fillStyle = resolveColor(GRID_DOT_COLOR, theme)

  const dotRadius = GRID_DOT_RADIUS / zoom
  ctx.beginPath()
  for (let x = startX; x <= endX; x += GRID_SPACING) {
    for (let y = startY; y <= endY; y += GRID_SPACING) {
      ctx.moveTo(x + dotRadius, y)
      ctx.arc(x, y, dotRadius, 0, TWO_PI)
    }
  }
  ctx.fill()

  ctx.restore()
}
