export type { BindableElement, BindingEndpoint } from "./types";
export {
  BASE_BINDING_GAP,
  BASE_BINDING_DISTANCE,
  MINIMUM_ARROW_SIZE,
  BINDING_COLORS,
  BINDING_HIGHLIGHT_LINE_WIDTH,
  BINDING_HIGHLIGHT_PADDING,
} from "./constants";
export {
  getHoveredElementForBinding,
  distanceToShapeEdge,
  computeFixedPoint,
  getPointFromFixedPoint,
} from "./proximity";
export {
  bindArrowToElement,
  unbindArrowEndpoint,
  unbindAllArrowsFromShape,
  unbindArrow,
  findBindableElement,
} from "./bindUnbind";
export {
  updateBoundArrowEndpoints,
  updateArrowEndpoint,
  updateArrowBindings,
} from "./updateBoundPoints";
export { renderSuggestedBinding } from "./renderBindingHighlight";
export {
  bindTextToContainer,
  unbindTextFromContainer,
  deleteBoundTextForContainer,
  updateBoundTextAfterContainerChange,
} from "./boundText";
