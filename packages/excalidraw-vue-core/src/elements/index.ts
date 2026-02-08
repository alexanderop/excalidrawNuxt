export { createElement } from './createElement'
export { mutateElement, moveElement } from './mutateElement'
export type {
  ExcalidrawElement,
  ExcalidrawElementBase,
  ExcalidrawElementType,
  ExcalidrawRectangleElement,
  ExcalidrawEllipseElement,
  ExcalidrawDiamondElement,
  ExcalidrawArrowElement,
  ExcalidrawTextElement,
  ArrowheadType,
  FillStyle,
  GroupId,
  TextAlign,
  FixedPointBinding,
  BoundElement,
  BindableElement,
} from './types'
export {
  isArrowElement,
  isTextElement,
  isLinearElement,
  isBindableElement,
} from './types'
export {
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
