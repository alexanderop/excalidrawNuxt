/**
 * Thin re-export layer over @excalidraw/math and @excalidraw/common.
 *
 * All point types are branded tuples: GlobalPoint (scene coordinates)
 * and LocalPoint (element-relative coordinates).
 *
 * Project-specific utilities (snapAngle, normalizePoints) live here
 * since they have no upstream equivalent.
 */

// ---------------------------------------------------------------------------
// Points (11 functions + 2 types)
// ---------------------------------------------------------------------------
export {
  pointFrom,
  pointFromArray,
  pointFromPair,
  pointFromVector,
  isPoint,
  pointCenter,
  pointDistance,
  pointDistanceSq,
  pointRotateRads,
  pointRotateDegs,
  pointTranslate,
  pointsEqual,
  pointScaleFromOrigin,
  isPointWithinBounds,
} from "@excalidraw/math";

export type { GlobalPoint, LocalPoint } from "@excalidraw/math";

// ---------------------------------------------------------------------------
// Vectors (12 functions + 1 type)
// ---------------------------------------------------------------------------
export {
  vector,
  vectorFromPoint,
  vectorCross,
  vectorAdd,
  vectorSubtract,
  vectorScale,
  vectorMagnitudeSq,
  vectorMagnitude,
  vectorNormalize,
  vectorNormal,
  isVector,
} from "@excalidraw/math";

export type { Vector } from "@excalidraw/math";

// ---------------------------------------------------------------------------
// Angles (7 functions + 2 types)
// ---------------------------------------------------------------------------
export {
  degreesToRadians,
  radiansToDegrees,
  normalizeRadians,
  isRightAngleRads,
} from "@excalidraw/math";

export type { Radians, Degrees } from "@excalidraw/math";

// ---------------------------------------------------------------------------
// Segments (6 functions + 1 type)
// ---------------------------------------------------------------------------
export {
  lineSegment,
  isLineSegment,
  segmentsIntersectAt,
  pointOnLineSegment,
  distanceToLineSegment,
  lineSegmentIntersectionPoints,
} from "@excalidraw/math";

export type { LineSegment } from "@excalidraw/math";

// ---------------------------------------------------------------------------
// Lines (2 functions + 1 type)
// ---------------------------------------------------------------------------
export { line, linesIntersectAt } from "@excalidraw/math";
export type { Line } from "@excalidraw/math";

// ---------------------------------------------------------------------------
// Polygons (5 functions + 1 type)
// ---------------------------------------------------------------------------
export {
  polygon,
  polygonFromPoints,
  polygonIncludesPoint,
  polygonIncludesPointNonZero,
  pointOnPolygon,
} from "@excalidraw/math";

export type { Polygon } from "@excalidraw/math";

// ---------------------------------------------------------------------------
// Ellipses (5 functions + 1 type)
// ---------------------------------------------------------------------------
export {
  ellipse,
  ellipseIncludesPoint,
  ellipseTouchesPoint,
  ellipseDistanceFromPoint,
  ellipseSegmentInterceptPoints,
} from "@excalidraw/math";

export type { Ellipse } from "@excalidraw/math";

// ---------------------------------------------------------------------------
// Rectangles (3 functions + 1 type)
// ---------------------------------------------------------------------------
export { rectangle } from "@excalidraw/math";

export type { Rectangle } from "@excalidraw/math";

// ---------------------------------------------------------------------------
// Curves (8 functions + 1 type)
// ---------------------------------------------------------------------------
export {
  curve,
  bezierEquation,
  curvePointDistance,
  curveClosestPoint,
  curveIntersectLineSegment,
  curveLength,
  curvePointAtLength,
  curveCatmullRomCubicApproxPoints,
} from "@excalidraw/math";

export type { Curve } from "@excalidraw/math";

// ---------------------------------------------------------------------------
// Triangles (1 function + 1 type)
// ---------------------------------------------------------------------------
export { triangleIncludesPoint } from "@excalidraw/math";
export type { Triangle } from "@excalidraw/math";

// ---------------------------------------------------------------------------
// Ranges (4 functions + 1 type)
// ---------------------------------------------------------------------------
export {
  rangeInclusive,
  rangesOverlap,
  rangeIntersection,
  rangeIncludesValue,
} from "@excalidraw/math";

export type { InclusiveRange } from "@excalidraw/math";

// ---------------------------------------------------------------------------
// Utils (7 functions)
// ---------------------------------------------------------------------------
export { PRECISION, clamp, round, average, isFiniteNumber, isCloseTo } from "@excalidraw/math";

// ---------------------------------------------------------------------------
// From @excalidraw/common
// ---------------------------------------------------------------------------
export { getSizeFromPoints } from "@excalidraw/common";

// ---------------------------------------------------------------------------
// Local imports for use within this file
// ---------------------------------------------------------------------------
import { pointFrom } from "@excalidraw/math";
import type { LocalPoint } from "@excalidraw/math";

export const TWO_PI = Math.PI * 2;

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Snap an angle (given by dx, dy) to the nearest 15-degree increment.
 * Returns the snapped displacement as a GlobalPoint.
 */
export function snapAngle(dx: number, dy: number): { dx: number; dy: number } {
  const angle = Math.atan2(dy, dx);
  const snapped = Math.round(angle / (Math.PI / 12)) * (Math.PI / 12);
  const length = Math.hypot(dx, dy);
  return { dx: Math.cos(snapped) * length, dy: Math.sin(snapped) * length };
}

/**
 * Normalize points so that point[0] is always at (0, 0).
 * When point[0] moves, the element's x/y shifts accordingly
 * and all other points are offset to compensate.
 */
export function normalizePoints(
  elementX: number,
  elementY: number,
  points: readonly LocalPoint[],
): { x: number; y: number; points: readonly LocalPoint[] } {
  const first = points[0];
  if (!first || (first[0] === 0 && first[1] === 0)) {
    return { x: elementX, y: elementY, points };
  }

  const dx = first[0];
  const dy = first[1];

  return {
    x: elementX + dx,
    y: elementY + dy,
    points: points.map((p) => pointFrom<LocalPoint>(p[0] - dx, p[1] - dy)),
  };
}
