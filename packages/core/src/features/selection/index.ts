export { getElementBounds, getCommonBounds } from "./bounds";
export type { Bounds } from "./bounds";

export { hitTest, getElementAtPosition, getHitThreshold } from "./hitTest";

export { getTransformHandles, getTransformHandleAtPosition } from "./transformHandles";
export type {
  TransformHandleDirection,
  TransformHandleType,
  TransformHandle,
  TransformHandles,
} from "./transformHandles";

export { startDrag, continueDrag, getConstrainedDelta, hasMoved } from "./dragElements";
export type { DragState } from "./dragElements";

export { resizeElement } from "./resizeElement";
export { rotateElement } from "./rotateElement";
export type { ResizeState } from "./resizeElement";

export { useSelection } from "./composables/useSelection";
export { useSelectionInteraction } from "./composables/useSelectionInteraction";

export {
  HANDLE_SIZE,
  HANDLE_MARGIN,
  ROTATION_HANDLE_OFFSET,
  SELECTION_COLORS,
  SELECTION_LINE_WIDTH,
  SELECTION_PADDING,
  MIN_ELEMENT_SIZE,
} from "./constants";
