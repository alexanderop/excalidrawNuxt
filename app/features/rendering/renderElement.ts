import type { RoughCanvas } from 'roughjs/bin/canvas'
import type { ExcalidrawElement, ExcalidrawTextElement } from '~/features/elements/types'
import { isArrowElement, isTextElement } from '~/features/elements/types'
import type { Theme } from '~/features/theme/types'
import { resolveColor } from '~/features/theme/colors'
import { generateShape } from './shapeGenerator'
import { renderArrowheads } from './arrowhead'
import { getFontString, getLineHeightInPx } from './textMeasurement'

export function renderElement(
  ctx: CanvasRenderingContext2D,
  rc: RoughCanvas,
  element: ExcalidrawElement,
  theme: Theme,
): void {
  if (element.isDeleted) return

  if (isArrowElement(element) && element.points.length < 2) return
  if (isTextElement(element)) {
    if (!element.text) return
    renderTextElement(ctx, element, theme)
    return
  }
  if (!isArrowElement(element) && element.width === 0 && element.height === 0) {
    return
  }

  ctx.save()
  ctx.translate(element.x, element.y)
  ctx.globalAlpha = element.opacity / 100

  const drawable = generateShape(element, theme)
  rc.draw(drawable)

  if (isArrowElement(element)) {
    renderArrowheads(ctx, element, theme)
  }

  ctx.restore()
}

function renderTextElement(
  ctx: CanvasRenderingContext2D,
  element: ExcalidrawTextElement,
  theme: Theme,
): void {
  ctx.save()
  ctx.translate(element.x, element.y)
  ctx.globalAlpha = element.opacity / 100

  const font = getFontString(element.fontSize, element.fontFamily)
  ctx.font = font
  ctx.fillStyle = resolveColor(element.strokeColor, theme)
  ctx.textAlign = element.textAlign as CanvasTextAlign
  ctx.textBaseline = 'top'

  const lineHeightPx = getLineHeightInPx(element.fontSize, element.lineHeight)
  const lines = element.text.split('\n')

  let horizontalOffset = 0
  switch (element.textAlign) {
    case 'center': { horizontalOffset = element.width / 2; break }
    case 'right': { horizontalOffset = element.width; break }
  }

  for (const [i, line] of lines.entries()) {
    ctx.fillText(line, horizontalOffset, i * lineHeightPx)
  }

  ctx.restore()
}
