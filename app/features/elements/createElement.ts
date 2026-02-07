import { generateId, randomInteger, randomVersionNonce } from '~/shared/random'
import type { ExcalidrawElement, ExcalidrawElementType } from './types'
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
  return {
    id: generateId(),
    type,
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
    ...overrides,
  }
}
