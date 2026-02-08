const FONT_FAMILY_MAP: Record<number, string> = {
  1: 'sans-serif',
  2: 'serif',
  3: 'monospace',
}

export function getFontString(fontSize: number, fontFamily: number): string {
  const family = FONT_FAMILY_MAP[fontFamily] ?? 'sans-serif'
  return `${fontSize}px ${family}`
}

export function getLineHeightInPx(fontSize: number, lineHeight: number): number {
  return fontSize * lineHeight
}

let _measureSpan: HTMLSpanElement | null = null

function getMeasureSpan(): HTMLSpanElement {
  if (_measureSpan) return _measureSpan

  const span = document.createElement('span')
  span.style.position = 'absolute'
  span.style.visibility = 'hidden'
  span.style.whiteSpace = 'pre'
  span.style.padding = '0'
  span.style.margin = '0'
  span.style.border = 'none'
  span.style.top = '-9999px'
  span.style.left = '-9999px'
  document.body.append(span)
  _measureSpan = span
  return span
}

export function measureText(text: string, font: string, lineHeight: number): { width: number; height: number } {
  const span = getMeasureSpan()
  span.style.font = font
  span.style.lineHeight = String(lineHeight)

  const lines = text.split('\n').map(line => line || ' ')
  const fontSize = Number.parseInt(font, 10)
  const lineHeightPx = getLineHeightInPx(fontSize, lineHeight)

  let maxWidth = 0
  for (const line of lines) {
    span.textContent = line
    const rect = span.getBoundingClientRect()
    if (rect.width > maxWidth) maxWidth = rect.width
  }

  return {
    width: Math.ceil(maxWidth),
    height: Math.ceil(lines.length * lineHeightPx),
  }
}
