export { isBindableElement } from '@excalidraw-vue/core/binding'
export type { BindableElement, BindingEndpoint } from '@excalidraw-vue/core/binding'
export {
  BASE_BINDING_GAP,
  BASE_BINDING_DISTANCE,
  MINIMUM_ARROW_SIZE,
  BINDING_COLORS,
  BINDING_HIGHLIGHT_LINE_WIDTH,
  BINDING_HIGHLIGHT_PADDING,
} from '@excalidraw-vue/core/binding'
export {
  getHoveredElementForBinding,
  distanceToShapeEdge,
  computeFixedPoint,
  getPointFromFixedPoint,
} from '@excalidraw-vue/core/binding'
export {
  bindArrowToElement,
  unbindArrowEndpoint,
  unbindAllArrowsFromShape,
  unbindArrow,
} from '@excalidraw-vue/core/binding'
export {
  updateBoundArrowEndpoints,
  updateArrowEndpoint,
} from '@excalidraw-vue/core/binding'
export { renderSuggestedBinding } from '@excalidraw-vue/core/binding'
