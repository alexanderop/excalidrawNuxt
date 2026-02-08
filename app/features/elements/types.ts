import type { Point } from '~/shared/math'

export type ArrowheadType = 'arrow' | 'triangle' | 'none'

export type FillStyle = 'hachure' | 'solid' | 'cross-hatch' | 'zigzag' | 'dots' | 'dashed' | 'zigzag-line'

export type GroupId = string

export type ExcalidrawElementType = 'rectangle' | 'ellipse' | 'diamond' | 'arrow' | 'text'

export type TextAlign = 'left' | 'center' | 'right'

export interface FixedPointBinding {
  readonly elementId: string
  readonly fixedPoint: readonly [number, number]
}

export interface BoundElement {
  readonly id: string
  readonly type: 'arrow'
}

export interface ExcalidrawElementBase {
  readonly id: string
  readonly type: ExcalidrawElementType
  x: number
  y: number
  width: number
  height: number
  angle: number
  strokeColor: string
  backgroundColor: string
  fillStyle: FillStyle
  strokeWidth: number
  roughness: number
  opacity: number
  seed: number
  versionNonce: number
  isDeleted: boolean
  boundElements: readonly BoundElement[]
  readonly groupIds: readonly GroupId[]
}

export interface ExcalidrawRectangleElement extends ExcalidrawElementBase {
  readonly type: 'rectangle'
}

export interface ExcalidrawEllipseElement extends ExcalidrawElementBase {
  readonly type: 'ellipse'
}

export interface ExcalidrawDiamondElement extends ExcalidrawElementBase {
  readonly type: 'diamond'
}

export interface ExcalidrawArrowElement extends ExcalidrawElementBase {
  readonly type: 'arrow'
  /** Relative points — first is always [0,0], rest are offsets from element.x/y */
  points: readonly Point[]
  startArrowhead: ArrowheadType | null
  endArrowhead: ArrowheadType
  startBinding: FixedPointBinding | null
  endBinding: FixedPointBinding | null
}

export interface ExcalidrawTextElement extends ExcalidrawElementBase {
  readonly type: 'text'
  text: string
  originalText: string
  fontSize: number
  fontFamily: number
  textAlign: TextAlign
  lineHeight: number
  autoResize: boolean
}

export type ExcalidrawElement =
  | ExcalidrawRectangleElement
  | ExcalidrawEllipseElement
  | ExcalidrawDiamondElement
  | ExcalidrawArrowElement
  | ExcalidrawTextElement
