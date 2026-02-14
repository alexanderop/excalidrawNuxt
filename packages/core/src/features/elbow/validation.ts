/**
 * Validation and post-processing utilities for elbow arrow points.
 *
 * Reference: excalidraw/packages/element/src/elbowArrow.ts
 * - validateElbowPoints() ~line 2323
 * - getElbowArrowCornerPoints() ~line 2184
 * - removeElbowArrowShortSegments() ~line 2212
 */

import { pointDistance } from "../../shared/math";
import type { GlobalPoint, LocalPoint } from "../../shared/math";
import { DEDUP_THRESHOLD } from "./constants";

/**
 * Validate that every consecutive segment in the point array is either
 * purely horizontal or purely vertical (within the given tolerance).
 *
 * Returns true if all segments are orthogonal.
 */
export function validateElbowPoints<P extends GlobalPoint | LocalPoint>(
  points: readonly P[],
  tolerance: number = DEDUP_THRESHOLD,
): boolean {
  return points
    .slice(1)
    .map(
      (p, i) =>
        Math.abs(p[0] - points[i]![0]) < tolerance || Math.abs(p[1] - points[i]![1]) < tolerance,
    )
    .every(Boolean);
}

/**
 * Remove short segments (shorter than `threshold`) from the point array.
 * First and last points are always preserved.
 *
 * Only operates on arrays with 4+ points (the minimum for a meaningful
 * elbow path with at least one corner).
 */
export function removeShortSegments<P extends GlobalPoint | LocalPoint>(
  points: readonly P[],
  threshold: number = DEDUP_THRESHOLD,
): P[] {
  if (points.length < 4) return [...points];

  return points.filter((p, idx) => {
    if (idx === 0 || idx === points.length - 1) return true;
    const prev = points[idx - 1]!;
    return pointDistance(prev, p) > threshold;
  });
}

/**
 * Extract only the corner points from a path — points where the
 * direction changes from horizontal to vertical or vice versa.
 * First and last points are always kept.
 */
export function getCornerPoints<P extends GlobalPoint | LocalPoint>(points: readonly P[]): P[] {
  if (points.length <= 1) return [...points];

  let previousHorizontal =
    Math.abs(points[0]![1] - points[1]![1]) < Math.abs(points[0]![0] - points[1]![0]);

  return points.filter((p, idx) => {
    if (idx === 0 || idx === points.length - 1) return true;

    const next = points[idx + 1]!;
    const nextHorizontal = Math.abs(p[1] - next[1]) < Math.abs(p[0] - next[0]);

    if (previousHorizontal === nextHorizontal) {
      previousHorizontal = nextHorizontal;
      return false;
    }

    previousHorizontal = nextHorizontal;
    return true;
  });
}
