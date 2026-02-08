import { generateId, randomInteger, randomVersionNonce } from '~/shared/random'
import { createPoint } from '~/shared/math'
import type { ExcalidrawElement, ExcalidrawElementType } from './types'
import {
  DEFAULT_BG_COLOR,
  DEFAULT_FILL_STYLE,
  DEFAULT_FONT_FAMILY,
  DEFAULT_FONT_SIZE,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_OPACITY,
  DEFAULT_ROUGHNESS,
  DEFAULT_STROKE_COLOR,
  DEFAULT_STROKE_WIDTH,
  DEFAULT_TEXT_ALIGN,
} from './constants'

export function createElement(
  type: ExcalidrawElementType,
  x: number,
  y: number,
  overrides: Partial<Omit<ExcalidrawElement, 'id' | 'type'>> = {},
): ExcalidrawElement {
  const base = {
    id: generateId(),
    x,
    y,
    width: 0,
    height: 0,
    angle: 0,
    strokeColor: DEFAULT_STROKE_COLOR,
    backgroundColor: DEFAULT_BG_COLOR,
    fillStyle: DEFAULT_FILL_STYLE,
    strokeWidth: DEFAULT_STROKE_WIDTH,
    roughness: DEFAULT_ROUGHNESS,
    opacity: DEFAULT_OPACITY,
    seed: randomInteger(),
    versionNonce: randomVersionNonce(),
    isDeleted: false,
    boundElements: [],
    groupIds: [],
    ...overrides,
  }

  if (type === 'text') {
    return {
      ...base,
      type: 'text',
      text: '',
      originalText: '',
      fontSize: DEFAULT_FONT_SIZE,
      fontFamily: DEFAULT_FONT_FAMILY,
      textAlign: DEFAULT_TEXT_ALIGN,
      lineHeight: DEFAULT_LINE_HEIGHT,
      autoResize: true,
    }
  }

  if (type === 'arrow') {
    return {
      ...base,
      type: 'arrow',
      points: [createPoint(0, 0)],
      startArrowhead: null,
      endArrowhead: 'arrow',
      startBinding: null,
      endBinding: null,
    }
  }

  if (type === 'rectangle') return { ...base, type }
  if (type === 'ellipse') return { ...base, type }
  if (type === 'diamond') return { ...base, type }

  const _exhaustive: never = type
  throw new Error(`Unhandled element type: ${String(_exhaustive)}`)
}
