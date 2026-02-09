import { generateId, randomInteger, randomVersionNonce } from '~/shared/random'
import { pointFrom } from '~/shared/math'
import type { LocalPoint, Radians } from '~/shared/math'
import type { SupportedElement } from './types'
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

type SupportedElementType = SupportedElement['type']

export function createElement(
  type: SupportedElementType,
  x: number,
  y: number,
  overrides: Record<string, unknown> = {},
): SupportedElement {
  const base = {
    id: generateId(),
    x,
    y,
    width: 0,
    height: 0,
    angle: 0 as Radians,
    strokeColor: DEFAULT_STROKE_COLOR,
    backgroundColor: DEFAULT_BG_COLOR,
    fillStyle: DEFAULT_FILL_STYLE,
    strokeWidth: DEFAULT_STROKE_WIDTH,
    strokeStyle: 'solid' as const,
    roughness: DEFAULT_ROUGHNESS,
    opacity: DEFAULT_OPACITY,
    seed: randomInteger(),
    versionNonce: randomVersionNonce(),
    version: 0,
    isDeleted: false,
    boundElements: null,
    groupIds: [] as readonly string[],
    index: null,
    frameId: null,
    locked: false,
    updated: Date.now(),
    link: null,
    roundness: null,
    customData: undefined,
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
      verticalAlign: 'top',
      containerId: null,
      lineHeight: DEFAULT_LINE_HEIGHT as number & { _brand: 'unitlessLineHeight' },
      autoResize: true,
    } as SupportedElement
  }

  if (type === 'arrow') {
    return {
      ...base,
      type: 'arrow',
      points: [pointFrom<LocalPoint>(0, 0)],
      lastCommittedPoint: null,
      startArrowhead: null,
      endArrowhead: 'arrow',
      startBinding: null,
      endBinding: null,
      elbowed: false,
    } as SupportedElement
  }

  if (type === 'rectangle') return { ...base, type } as SupportedElement
  if (type === 'ellipse') return { ...base, type } as SupportedElement
  if (type === 'diamond') return { ...base, type } as SupportedElement

  throw new Error(`Unhandled element type: ${String(type)}`)
}
