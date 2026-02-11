import type { ShallowRef } from "vue";
import type { ExcalidrawLinearElement } from "~/features/elements/types";
import type { GlobalPoint } from "~/shared/math";

export interface MultiPointCreationState {
  /** The linear element being actively constructed via click-to-place */
  element: ShallowRef<ExcalidrawLinearElement | null>;
  /** Current cursor position for rubber-band preview */
  lastCursorPoint: ShallowRef<GlobalPoint | null>;
}

export interface LinearEditorState {
  /** The linear element currently being edited */
  element: ShallowRef<ExcalidrawLinearElement | null>;
  /** Indices of selected points in the points array */
  selectedPointIndices: ShallowRef<ReadonlySet<number>>;
  /** Segment index where a midpoint indicator is hovered (null if none) */
  hoveredMidpointIndex: ShallowRef<number | null>;
}
