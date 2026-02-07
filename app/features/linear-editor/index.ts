export {
  POINT_HANDLE_RADIUS,
  MIDPOINT_HANDLE_RADIUS,
  POINT_HIT_THRESHOLD,
  MIDPOINT_HIT_THRESHOLD,
  POINT_HANDLE_FILL,
  POINT_HANDLE_STROKE,
  POINT_HANDLE_SELECTED_FILL,
  MIDPOINT_HANDLE_FILL,
  MIDPOINT_HANDLE_STROKE,
  RUBBER_BAND_COLOR,
  RUBBER_BAND_DASH,
  RUBBER_BAND_WIDTH,
} from './constants'

export type {
  MultiPointCreationState,
  LinearEditorState,
} from './types'

export {
  getPointPositions,
  getMidpointPositions,
  hitTestPointHandles,
  hitTestMidpoints,
  insertPointAtSegment,
  removePoints,
  normalizePoints,
  movePoint,
  movePoints,
  computeDimensionsFromPoints,
} from './pointHandles'

export { useMultiPointCreation } from './useMultiPointCreation'
export { useLinearEditor } from './useLinearEditor'

export {
  renderRubberBand,
  renderPointHandles,
  renderMidpointIndicator,
} from './renderLinearEditor'
