/**
 * Element type re-exports from the official @excalidraw/element package.
 *
 * We re-export the exact types from the official package so that our
 * codebase stays compatible with upstream. We also define `SupportedElement`
 * and `SupportedBindableElement` as narrow unions for the 5 element types
 * we actually render (rectangle, ellipse, diamond, arrow, text).
 */

// ---------------------------------------------------------------------------
// Official type re-exports
// ---------------------------------------------------------------------------
export type {
  ExcalidrawElement,
  ExcalidrawRectangleElement,
  ExcalidrawEllipseElement,
  ExcalidrawDiamondElement,
  ExcalidrawArrowElement,
  ExcalidrawTextElement,
  ExcalidrawLinearElement,
  FixedPointBinding,
  PointBinding,
  BoundElement,
  Arrowhead,
  FillStyle,
  GroupId,
  TextAlign,
  ExcalidrawElementType,
  ElementsMap,
  FractionalIndex,
  StrokeStyle,
  NonDeletedExcalidrawElement,
  NonDeleted,
} from '@excalidraw/element/types'

// ---------------------------------------------------------------------------
// Official type guard re-exports (runtime functions)
// ---------------------------------------------------------------------------
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
} from '@excalidraw/element'

// ---------------------------------------------------------------------------
// Narrow unions for our supported subset
// ---------------------------------------------------------------------------
import type {
  ExcalidrawRectangleElement,
  ExcalidrawEllipseElement,
  ExcalidrawDiamondElement,
  ExcalidrawArrowElement,
  ExcalidrawTextElement,
} from '@excalidraw/element/types'

/** The 5 element types our app creates and renders. */
export type SupportedElement =
  | ExcalidrawRectangleElement
  | ExcalidrawEllipseElement
  | ExcalidrawDiamondElement
  | ExcalidrawArrowElement
  | ExcalidrawTextElement

/** The 3 shape types that arrows can bind to. */
export type SupportedBindableElement =
  | ExcalidrawRectangleElement
  | ExcalidrawEllipseElement
  | ExcalidrawDiamondElement
