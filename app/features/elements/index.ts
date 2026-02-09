export { createElement } from './createElement'
export { mutateElement, moveElement } from './mutateElement'
export { useElements } from './useElements'
export type {
  ExcalidrawElement,
  ExcalidrawElementType,
  ExcalidrawRectangleElement,
  ExcalidrawEllipseElement,
  ExcalidrawDiamondElement,
  ExcalidrawArrowElement,
  ExcalidrawTextElement,
  ExcalidrawLinearElement,
  Arrowhead,
  FillStyle,
  GroupId,
  TextAlign,
  FixedPointBinding,
  PointBinding,
  BoundElement,
  SupportedElement,
  SupportedBindableElement,
  ElementsMap,
  FractionalIndex,
  StrokeStyle,
  NonDeletedExcalidrawElement,
  NonDeleted,
} from './types'
export {
  isArrowElement,
  isTextElement,
  isLinearElement,
  isBindableElement,
  isFixedPointBinding,
  isEmbeddableElement,
  isFreeDrawElement,
  isFrameElement,
  isFrameLikeElement,
  isElbowArrow,
  isLineElement,
  isExcalidrawElement,
} from './types'

// ---------------------------------------------------------------------------
// Element utilities from @excalidraw/element
// ---------------------------------------------------------------------------
export {
  getNonDeletedElements,
  getVisibleElements,
  isNonDeletedElement,
  hashElementsVersion,
  hashString,
  isInvisiblySmallElement,
  getNormalizedDimensions,
} from '@excalidraw/element'

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

// ---------------------------------------------------------------------------
// Bound text utilities from @excalidraw/element
// ---------------------------------------------------------------------------
export {
  wrapText,
  getBoundTextMaxWidth,
  getBoundTextMaxHeight,
  computeBoundTextPosition,
  computeContainerDimensionForBoundText,
  getBoundTextElement,
  getContainerElement,
  isTextBindableContainer,
  hasBoundTextElement,
  isBoundToContainer,
} from '@excalidraw/element'

export { BOUND_TEXT_PADDING } from '@excalidraw/common'
