import type { Point } from '~/shared/math'

export type ArrowheadType = 'arrow' | 'triangle' | 'none'

export type ExcalidrawElementType = 'rectangle' | 'ellipse' | 'diamond' | 'arrow'

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
  fillStyle: string
  strokeWidth: number
  roughness: number
  opacity: number
  seed: number
  versionNonce: number
  isDeleted: boolean
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
}

export type ExcalidrawElement =
  | ExcalidrawRectangleElement
  | ExcalidrawEllipseElement
  | ExcalidrawDiamondElement
  | ExcalidrawArrowElement
