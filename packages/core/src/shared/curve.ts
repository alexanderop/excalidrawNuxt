/**
 * Catmull-Rom / Bezier curve math for curved arrows.
 *
 * Converts Catmull-Rom splines into cubic Bezier curves,
 * evaluates points, computes arc lengths, and finds closest
 * points for hit testing.
 */

import { pointFrom, pointDistance } from "./math";
import type { LocalPoint } from "./math";

/** A cubic Bezier curve defined by 4 control points [start, cp1, cp2, end]. */
export type CubicBezier = readonly [LocalPoint, LocalPoint, LocalPoint, LocalPoint];

export const CATMULL_ROM_TENSION = 0.5;

/**
 * Convert a sequence of points into cubic Bezier curves using Catmull-Rom interpolation.
 *
 * For each consecutive pair (p1, p2) with neighbors p0 and p3:
 * - tangent1 = (p2 - p0) * tension
 * - tangent2 = (p3 - p1) * tension
 * - cp1 = p1 + tangent1 / 3
 * - cp2 = p2 - tangent2 / 3
 *
 * Boundary conditions: duplicate first/last points for missing neighbors.
 */
export function curveCatmullRomToBezier(
  points: readonly LocalPoint[],
  tension: number = CATMULL_ROM_TENSION,
): CubicBezier[] {
  if (points.length < 2) {
    return [];
  }

  const curves: CubicBezier[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[i + 2] ?? p2;

    const t1x = (p2[0] - p0[0]) * tension;
    const t1y = (p2[1] - p0[1]) * tension;
    const t2x = (p3[0] - p1[0]) * tension;
    const t2y = (p3[1] - p1[1]) * tension;

    const cp1 = pointFrom<LocalPoint>(p1[0] + t1x / 3, p1[1] + t1y / 3);
    const cp2 = pointFrom<LocalPoint>(p2[0] - t2x / 3, p2[1] - t2y / 3);

    curves.push([p1, cp1, cp2, p2]);
  }

  return curves;
}

/**
 * Evaluate a cubic Bezier curve at parameter t in [0, 1].
 *
 * B(t) = (1-t)^3 * P0 + 3(1-t)^2 * t * P1 + 3(1-t) * t^2 * P2 + t^3 * P3
 */
export function bezierPoint(c: CubicBezier, t: number): LocalPoint {
  const u = 1 - t;
  const uu = u * u;
  const uuu = uu * u;
  const tt = t * t;
  const ttt = tt * t;

  const x = uuu * c[0][0] + 3 * uu * t * c[1][0] + 3 * u * tt * c[2][0] + ttt * c[3][0];
  const y = uuu * c[0][1] + 3 * uu * t * c[1][1] + 3 * u * tt * c[2][1] + ttt * c[3][1];

  return pointFrom<LocalPoint>(x, y);
}

/**
 * Find the closest point on a Bezier curve to a given point.
 *
 * Coarse pass: sample 30 points along the curve, find closest.
 * Fine pass: ternary search around the closest sample.
 */
export function bezierClosestPoint(
  c: CubicBezier,
  point: LocalPoint,
): { t: number; point: LocalPoint; distance: number } {
  const COARSE_SAMPLES = 30;

  let bestT = 0;
  let bestDist = Infinity;

  for (let i = 0; i <= COARSE_SAMPLES; i++) {
    const t = i / COARSE_SAMPLES;
    const p = bezierPoint(c, t);
    const d = pointDistance(p, point);
    if (d < bestDist) {
      bestDist = d;
      bestT = t;
    }
  }

  // Fine pass: ternary search around the best sample
  let lo = Math.max(0, bestT - 1 / COARSE_SAMPLES);
  let hi = Math.min(1, bestT + 1 / COARSE_SAMPLES);

  while (hi - lo > 1e-4) {
    const t1 = lo + (hi - lo) / 3;
    const t2 = hi - (hi - lo) / 3;

    const d1 = pointDistance(bezierPoint(c, t1), point);
    const d2 = pointDistance(bezierPoint(c, t2), point);

    if (d1 < d2) {
      hi = t2;
      continue;
    }
    lo = t1;
  }

  const finalT = (lo + hi) / 2;
  const finalPoint = bezierPoint(c, finalT);
  const finalDist = pointDistance(finalPoint, point);

  return { t: finalT, point: finalPoint, distance: finalDist };
}

/**
 * Approximate arc length of a cubic Bezier curve by summing distances
 * between N sample points.
 */
export function bezierLength(c: CubicBezier, steps: number = 20): number {
  let length = 0;
  let prev = bezierPoint(c, 0);

  for (let i = 1; i <= steps; i++) {
    const curr = bezierPoint(c, i / steps);
    length += pointDistance(prev, curr);
    prev = curr;
  }

  return length;
}

/**
 * Find minimum distance from a point to any curve in the array.
 * Returns Infinity if curves array is empty.
 */
export function distanceToBezierCurves(curves: readonly CubicBezier[], point: LocalPoint): number {
  if (curves.length === 0) {
    return Infinity;
  }

  let minDist = Infinity;

  for (const c of curves) {
    const { distance } = bezierClosestPoint(c, point);
    if (distance < minDist) {
      minDist = distance;
    }
  }

  return minDist;
}
