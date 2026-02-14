import type { LocalPoint } from "../../shared/math";

/** A user-anchored segment that must not be rerouted. */
export interface FixedSegment {
  /** Start point (must be purely horizontal or vertical with `end`). */
  start: LocalPoint;
  /** End point (must be purely horizontal or vertical with `start`). */
  end: LocalPoint;
  /** Segment index in the arrow's points array. */
  index: number;
}
