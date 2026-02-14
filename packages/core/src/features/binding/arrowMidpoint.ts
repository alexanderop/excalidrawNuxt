import type { ExcalidrawArrowElement } from "../elements/types";
import type { GlobalPoint } from "../../shared/math";
import {
  pointFrom,
  pointDistance,
  curveLength,
  curvePointAtLength,
  curveCatmullRomCubicApproxPoints,
} from "../../shared/math";

/**
 * Compute the global midpoint of an arrow for text label positioning.
 * - Straight arrows (roundness === null): linear interpolation at 50% along total path length
 * - Curved arrows (roundness !== null): evaluate Bezier at 50% arc length
 */
export function getArrowMidpoint(arrow: ExcalidrawArrowElement): GlobalPoint {
  const { points } = arrow;

  if (points.length < 2) {
    return pointFrom<GlobalPoint>(arrow.x, arrow.y);
  }

  if (arrow.roundness !== null) {
    return getCurvedArrowMidpoint(arrow);
  }

  return getStraightArrowMidpoint(arrow);
}

/**
 * Midpoint for straight (sharp) arrows.
 * Walks segments and finds the point at 50% of total path length.
 */
function getStraightArrowMidpoint(arrow: ExcalidrawArrowElement): GlobalPoint {
  const { points } = arrow;

  // Calculate total path length
  let totalLength = 0;
  for (let i = 1; i < points.length; i++) {
    totalLength += pointDistance(points[i - 1]!, points[i]!);
  }

  const halfLength = totalLength / 2;
  let accumulated = 0;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]!;
    const curr = points[i]!;
    const segLen = pointDistance(prev, curr);
    if (accumulated + segLen >= halfLength) {
      // The midpoint is on this segment
      const remaining = halfLength - accumulated;
      const t = segLen === 0 ? 0 : remaining / segLen;
      const localX = prev[0] + (curr[0] - prev[0]) * t;
      const localY = prev[1] + (curr[1] - prev[1]) * t;
      return pointFrom<GlobalPoint>(arrow.x + localX, arrow.y + localY);
    }
    accumulated += segLen;
  }

  // Fallback: last point
  const last = points.at(-1)!;
  return pointFrom<GlobalPoint>(arrow.x + last[0], arrow.y + last[1]);
}

/**
 * Midpoint for curved arrows.
 * Converts to Catmull-Rom Bezier curves and finds the point at 50% arc length.
 */
function getCurvedArrowMidpoint(arrow: ExcalidrawArrowElement): GlobalPoint {
  const { points } = arrow;

  // Convert local points to GlobalPoint for the curve math
  const globalPoints = points.map((p) => pointFrom<GlobalPoint>(arrow.x + p[0], arrow.y + p[1]));

  const curves = curveCatmullRomCubicApproxPoints<GlobalPoint>(globalPoints);
  if (!curves || curves.length === 0) {
    // Fallback to straight midpoint if curve generation fails
    return getStraightArrowMidpoint(arrow);
  }

  // Calculate total length across all curve segments
  let totalLength = 0;
  const segmentLengths: number[] = [];
  for (const c of curves) {
    const len = curveLength(c);
    segmentLengths.push(len);
    totalLength += len;
  }

  const halfLength = totalLength / 2;
  let accumulated = 0;

  for (const [i, curve] of curves.entries()) {
    const segLen = segmentLengths[i]!;
    if (accumulated + segLen >= halfLength) {
      // The midpoint is on this curve segment
      const remaining = halfLength - accumulated;
      const percent = segLen === 0 ? 0 : remaining / segLen;
      return curvePointAtLength(curve!, percent);
    }
    accumulated += segLen;
  }

  // Fallback: end of last curve
  const lastCurve = curves.at(-1)!;
  return curvePointAtLength(lastCurve, 1);
}
