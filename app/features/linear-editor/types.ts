import type { ShallowRef } from 'vue'
import type { ExcalidrawArrowElement } from '~/features/elements/types'
import type { Point } from '~/shared/math'

export interface MultiPointCreationState {
  /** The arrow being actively constructed via click-to-place */
  element: ShallowRef<ExcalidrawArrowElement | null>
  /** Current cursor position for rubber-band preview */
  lastCursorPoint: ShallowRef<Point | null>
}

export interface LinearEditorState {
  /** The arrow currently being edited */
  element: ShallowRef<ExcalidrawArrowElement | null>
  /** Indices of selected points in the points array */
  selectedPointIndices: ShallowRef<ReadonlySet<number>>
  /** Segment index where a midpoint indicator is hovered (null if none) */
  hoveredMidpointIndex: ShallowRef<number | null>
}
