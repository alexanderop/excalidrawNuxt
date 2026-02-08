export {
  POINT_HANDLE_RADIUS,
  MIDPOINT_HANDLE_RADIUS,
  POINT_HIT_THRESHOLD,
  MIDPOINT_HIT_THRESHOLD,
  LINEAR_EDITOR_COLORS,
  RUBBER_BAND_DASH,
  RUBBER_BAND_WIDTH,
} from '@excalidraw-vue/core/linear-editor'

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
} from '@excalidraw-vue/core/linear-editor'

export { useMultiPointCreation } from './useMultiPointCreation'
export { useLinearEditor } from './useLinearEditor'

export {
  renderRubberBand,
  renderPointHandles,
  renderMidpointIndicator,
} from '@excalidraw-vue/core/linear-editor'
