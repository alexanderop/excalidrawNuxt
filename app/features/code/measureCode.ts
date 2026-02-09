import {
  CODE_CHAR_WIDTH,
  CODE_LINE_HEIGHT,
  CODE_PADDING,
  CODE_MIN_WIDTH,
  CODE_MIN_HEIGHT,
} from './constants'

interface CodeMeasurement {
  width: number
  height: number
  lineCount: number
}

export function measureCode(code: string, fontSize: number): CodeMeasurement {
  const lines = code.split('\n')
  const lineCount = lines.length
  const charWidth = CODE_CHAR_WIDTH * (fontSize / 14)
  const lineHeightPx = fontSize * CODE_LINE_HEIGHT

  const maxLineLength = lines.reduce((max, line) => Math.max(max, line.length), 0)

  const contentWidth = maxLineLength * charWidth
  const contentHeight = lineCount * lineHeightPx

  const width = Math.max(
    contentWidth + CODE_PADDING.left + CODE_PADDING.right,
    CODE_MIN_WIDTH,
  )
  const height = Math.max(
    contentHeight + CODE_PADDING.top + CODE_PADDING.bottom,
    CODE_MIN_HEIGHT,
  )

  return { width, height, lineCount }
}
