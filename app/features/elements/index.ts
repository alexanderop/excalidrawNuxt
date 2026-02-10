export { createElement } from './createElement'
export { mutateElement, moveElement } from './mutateElement'
export { useElements } from './useElements'
export { useLayerOrder } from './composables/useLayerOrder'
export type {
  ExcalidrawElement,
  ExcalidrawElementType,
  ExcalidrawRectangleElement,
  ExcalidrawEllipseElement,
  ExcalidrawDiamondElement,
  ExcalidrawArrowElement,
  ExcalidrawTextElement,
  ExcalidrawLinearElement,
  ExcalidrawImageElement,
  InitializedExcalidrawImageElement,
  FileId,
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
  isImageElement,
  isInitializedImageElement,
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
  newElementWith,
  bumpVersion,
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

export { BOUND_TEXT_PADDING, arrayToMap } from '@excalidraw/common'
