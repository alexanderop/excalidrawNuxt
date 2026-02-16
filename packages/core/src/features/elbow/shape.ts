/* v8 ignore start -- Elbow shape generation; covered by core unit tests (shape.unit.test.ts) */
/**
 * Elbow arrow SVG path generation with rounded corners.
 *
 * Converts orthogonal elbow points into an SVG path string
 * with quadratic Bezier curves at each corner for smooth
 * rounded transitions.
 *
 * Reference: excalidraw/packages/element/src/shape.ts ~line 875
 */

import { pointDistance } from "../../shared/math";
import type { LocalPoint } from "../../shared/math";
import { headingForPointIsHorizontal } from "../binding/heading";
import { ELBOW_CORNER_RADIUS } from "./constants";

/**
 * Generate an SVG path string for elbow arrow points with rounded corners.
 *
 * For each interior point (not first or last), calculates a corner radius
 * that is the minimum of:
 * - ELBOW_CORNER_RADIUS (16px)
 * - Half the distance to the next point
 * - Half the distance to the previous point
 *
 * Then generates:
 * - L (line) to the point just before the corner
 * - Q (quadratic Bezier) through the corner point to just after the corner
 * - L (line) to the next segment
 *
 * @param points - Array of orthogonal (elbow) points in local coordinates
 * @param radius - Maximum corner radius (default: ELBOW_CORNER_RADIUS)
 * @returns SVG path data string
 */

/** Calculate the approach point before a corner along the incoming segment. */
function approachPoint(point: LocalPoint, prev: LocalPoint, corner: number): [number, number] {
  const isHorizontal = headingForPointIsHorizontal(point, prev);
  if (isHorizontal) {
    const offsetX = prev[0] < point[0] ? -corner : corner;
    return [point[0] + offsetX, point[1]];
  }
  const offsetY = prev[1] < point[1] ? -corner : corner;
  return [point[0], point[1] + offsetY];
}

/** Calculate the departure point after a corner along the outgoing segment. */
function departurePoint(point: LocalPoint, next: LocalPoint, corner: number): [number, number] {
  const isHorizontal = headingForPointIsHorizontal(next, point);
  if (isHorizontal) {
    const offsetX = next[0] < point[0] ? -corner : corner;
    return [point[0] + offsetX, point[1]];
  }
  const offsetY = next[1] < point[1] ? -corner : corner;
  return [point[0], point[1] + offsetY];
}

export function generateElbowArrowShape(
  points: readonly LocalPoint[],
  radius: number = ELBOW_CORNER_RADIUS,
): string {
  if (points.length < 2) return "";

  const first = points[0]!;
  const subpoints: [number, number][] = [];

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1]!;
    const next = points[i + 1]!;
    const point = points[i]!;

    const corner = Math.min(radius, pointDistance(point, next) / 2, pointDistance(point, prev) / 2);

    subpoints.push(
      approachPoint(point, prev, corner),
      [point[0], point[1]],
      departurePoint(point, next, corner),
    );
  }

  const d = [`M ${first[0]} ${first[1]}`];
  for (let i = 0; i < subpoints.length; i += 3) {
    const before = subpoints[i]!;
    const ctrl = subpoints[i + 1]!;
    const after = subpoints[i + 2]!;
    d.push(`L ${before[0]} ${before[1]}`, `Q ${ctrl[0]} ${ctrl[1]}, ${after[0]} ${after[1]}`);
  }

  const last = points.at(-1)!;
  d.push(`L ${last[0]} ${last[1]}`);

  return d.join(" ");
}
