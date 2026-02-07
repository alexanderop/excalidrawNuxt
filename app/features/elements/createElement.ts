import { generateId, randomInteger, randomVersionNonce } from '~/shared/random'
import { createPoint } from '~/shared/math'
import type { ExcalidrawElement, ExcalidrawElementType, ExcalidrawArrowElement } from './types'
import {
  DEFAULT_BG_COLOR,
  DEFAULT_FILL_STYLE,
  DEFAULT_OPACITY,
  DEFAULT_ROUGHNESS,
  DEFAULT_STROKE_COLOR,
  DEFAULT_STROKE_WIDTH,
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
    ...overrides,
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
    } satisfies ExcalidrawArrowElement
  }

  if (type === 'rectangle') return { ...base, type }
  if (type === 'ellipse') return { ...base, type }
  return { ...base, type: 'diamond' }
}
