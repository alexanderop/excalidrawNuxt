import type {
  ExcalidrawElement,
  ExcalidrawRectangleElement,
  ExcalidrawEllipseElement,
  ExcalidrawDiamondElement,
} from '~/features/elements/types'

export type BindableElement =
  | ExcalidrawRectangleElement
  | ExcalidrawEllipseElement
  | ExcalidrawDiamondElement

export type BindingEndpoint = 'start' | 'end'

export function isBindableElement(el: ExcalidrawElement): el is BindableElement {
  return el.type === 'rectangle' || el.type === 'ellipse' || el.type === 'diamond'
}
