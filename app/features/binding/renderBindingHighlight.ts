import type { ExcalidrawElement } from '~/features/elements/types'
import type { Theme } from '~/features/theme'
import {
  BINDING_COLORS,
  BINDING_HIGHLIGHT_LINE_WIDTH,
  BINDING_HIGHLIGHT_PADDING,
} from './constants'

/**
 * Draw a highlight outline around a bindable shape to indicate
 * that an arrow endpoint can bind to it.
 */
export function renderSuggestedBinding(
  ctx: CanvasRenderingContext2D,
  element: ExcalidrawElement,
  zoom: number,
  theme: Theme,
): void {
  if (element.type === 'arrow') return
  if (element.type === 'text') return

  const padding = BINDING_HIGHLIGHT_PADDING / zoom
  const lineWidth = BINDING_HIGHLIGHT_LINE_WIDTH / zoom

  ctx.save()
  ctx.strokeStyle = BINDING_COLORS[theme].highlight
  ctx.lineWidth = lineWidth
  ctx.setLineDash([])

  const cx = element.x + element.width / 2
  const cy = element.y + element.height / 2

  ctx.translate(cx, cy)
  ctx.rotate(element.angle)

  switch (element.type) {
    case 'rectangle': {
      ctx.strokeRect(
        -element.width / 2 - padding,
        -element.height / 2 - padding,
        element.width + padding * 2,
        element.height + padding * 2,
      )
      break
    }
    case 'ellipse': {
      const rx = element.width / 2 + padding
      const ry = element.height / 2 + padding
      ctx.beginPath()
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
      ctx.stroke()
      break
    }
    case 'diamond': {
      const hw = element.width / 2 + padding
      const hh = element.height / 2 + padding
      ctx.beginPath()
      ctx.moveTo(0, -hh)
      ctx.lineTo(hw, 0)
      ctx.lineTo(0, hh)
      ctx.lineTo(-hw, 0)
      ctx.closePath()
      ctx.stroke()
      break
    }
    default: {
      const _exhaustive: never = element
      throw new Error(`Unhandled element type: ${String(_exhaustive)}`)
    }
  }

  ctx.restore()
}
