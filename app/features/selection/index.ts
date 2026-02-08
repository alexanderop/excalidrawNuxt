export { getElementBounds, getCommonBounds } from '@excalidraw-vue/core/selection'
export type { Bounds } from '@excalidraw-vue/core/selection'

export { hitTest, getElementAtPosition, getHitThreshold } from '@excalidraw-vue/core/selection'

export {
  getTransformHandles,
  getTransformHandleAtPosition,
} from '@excalidraw-vue/core/selection'
export type {
  TransformHandleDirection,
  TransformHandleType,
  TransformHandle,
  TransformHandles,
} from '@excalidraw-vue/core/selection'

export { startDrag, continueDrag, getConstrainedDelta, hasMoved } from '@excalidraw-vue/core/selection'
export type { DragState } from '@excalidraw-vue/core/selection'

export { resizeElement } from '@excalidraw-vue/core/selection'
export type { ResizeState } from '@excalidraw-vue/core/selection'

export { useSelection } from './composables/useSelection'
export { useSelectionInteraction } from './composables/useSelectionInteraction'

export {
  HANDLE_SIZE,
  HANDLE_MARGIN,
  ROTATION_HANDLE_OFFSET,
  SELECTION_COLORS,
  SELECTION_LINE_WIDTH,
  SELECTION_PADDING,
  MIN_ELEMENT_SIZE,
} from '@excalidraw-vue/core/selection'
