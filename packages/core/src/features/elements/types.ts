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
  ExcalidrawLineElement,
  ExcalidrawTextElement,
  ExcalidrawLinearElement,
  ExcalidrawImageElement,
  ExcalidrawFreeDrawElement,
  InitializedExcalidrawImageElement,
  FileId,
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
} from "@excalidraw/element/types";

// Our custom embeddable type is re-exported from below (not from @excalidraw/element)

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
  isImageElement,
  isInitializedImageElement,
} from "@excalidraw/element";

// ---------------------------------------------------------------------------
// Narrow unions for our supported subset
// ---------------------------------------------------------------------------
import type {
  ExcalidrawElement,
  ExcalidrawRectangleElement,
  ExcalidrawEllipseElement,
  ExcalidrawDiamondElement,
  ExcalidrawArrowElement,
  ExcalidrawLineElement,
  ExcalidrawTextElement,
  ExcalidrawImageElement,
  ExcalidrawFreeDrawElement,
} from "@excalidraw/element/types";

/** Embeddable element — stores a URL in `link` and renders as a live iframe overlay. */
export type ExcalidrawEmbeddableElement = Omit<ExcalidrawElement, "type"> & {
  readonly type: "embeddable";
};

/** The element types our app creates and renders. */
export type SupportedElement =
  | ExcalidrawRectangleElement
  | ExcalidrawEllipseElement
  | ExcalidrawDiamondElement
  | ExcalidrawArrowElement
  | ExcalidrawLineElement
  | ExcalidrawTextElement
  | ExcalidrawImageElement
  | ExcalidrawFreeDrawElement
  | ExcalidrawEmbeddableElement;

/** The 3 shape types that arrows can bind to. */
export type SupportedBindableElement =
  | ExcalidrawRectangleElement
  | ExcalidrawEllipseElement
  | ExcalidrawDiamondElement;

// ---------------------------------------------------------------------------
// Helper types for type-safe mutations
// ---------------------------------------------------------------------------

/**
 * Flattens a union into a single object type containing all possible keys.
 * For overlapping keys the value type is a union of all member types.
 */
type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (
  k: infer I,
) => void
  ? I
  : never;
type FlattenUnion<T> = {
  [K in keyof UnionToIntersection<T>]: T extends Record<K, infer V> ? V : never;
};

/** Writable version of all SupportedElement properties (removes readonly modifiers). */
export type MutableElement = {
  -readonly [K in keyof FlattenUnion<SupportedElement>]: FlattenUnion<SupportedElement>[K];
};

/** Maps element type string to its concrete type. */
export interface ElementTypeMap {
  rectangle: ExcalidrawRectangleElement;
  ellipse: ExcalidrawEllipseElement;
  diamond: ExcalidrawDiamondElement;
  arrow: ExcalidrawArrowElement;
  line: ExcalidrawLineElement;
  text: ExcalidrawTextElement;
  image: ExcalidrawImageElement;
  freedraw: ExcalidrawFreeDrawElement;
  embeddable: ExcalidrawEmbeddableElement;
}

/** Union of supported element type strings. */
export type SupportedElementType = SupportedElement["type"];
