/**
 * Cardinal direction system for elbow arrows.
 *
 * Headings determine which edge of a shape an arrow exits or enters.
 * Uses triangle search cones from the element AABB center to determine
 * which quadrant a point falls in, then returns the corresponding direction.
 *
 * Reference: excalidraw/packages/element/src/heading.ts
 */

import {
  pointFrom,
  pointScaleFromOrigin,
  triangleIncludesPoint,
  vectorCross,
  vectorFromPoint,
  vectorScale,
  pointFromVector,
  pointRotateRads,
} from "../../shared/math";
import type { GlobalPoint, LocalPoint, Radians, Triangle, Vector } from "../../shared/math";
import type { Bounds } from "../selection/bounds";

// ---------------------------------------------------------------------------
// Heading type and constants
// ---------------------------------------------------------------------------

export type Heading = [1, 0] | [0, 1] | [-1, 0] | [0, -1];

export const HEADING_RIGHT: Heading = [1, 0];
export const HEADING_DOWN: Heading = [0, 1];
export const HEADING_LEFT: Heading = [-1, 0];
export const HEADING_UP: Heading = [0, -1];

/** Multiplier for expanding search cones from element center. */
const SEARCH_CONE_MULTIPLIER = 2;

// ---------------------------------------------------------------------------
// Core heading functions
// ---------------------------------------------------------------------------

/** Snap a vector to the nearest cardinal direction. */
export const vectorToHeading = (vec: Vector): Heading => {
  const [x, y] = vec;
  const absX = Math.abs(x);
  const absY = Math.abs(y);
  if (x > absY) return HEADING_RIGHT;
  if (x <= -absY) return HEADING_LEFT;
  if (y > absX) return HEADING_DOWN;
  return HEADING_UP;
};

/** Negate a single heading component: 0 stays 0, positive becomes -1, negative becomes 1. */
function flipComponent(v: number): -1 | 0 | 1 {
  if (v === 0) return 0;
  return v > 0 ? -1 : 1;
}

/** Reverse a heading direction. */
export const flipHeading = (h: Heading): Heading =>
  [flipComponent(h[0]), flipComponent(h[1])] as Heading;

/** Check if two headings are equal. */
export const compareHeading = (a: Heading, b: Heading): boolean => a[0] === b[0] && a[1] === b[1];

/** Check if a heading is horizontal (LEFT or RIGHT). */
export const headingIsHorizontal = (a: Heading): boolean =>
  compareHeading(a, HEADING_RIGHT) || compareHeading(a, HEADING_LEFT);

/** Check if a heading is vertical (UP or DOWN). */
export const headingIsVertical = (a: Heading): boolean => !headingIsHorizontal(a);

/** Get heading from one point to another. */
export const headingForPoint = <P extends GlobalPoint | LocalPoint>(p: P, o: P): Heading =>
  vectorToHeading(vectorFromPoint<P>(p, o));

/** Check if the heading between two points is horizontal. */
export const headingForPointIsHorizontal = <P extends GlobalPoint | LocalPoint>(
  p: P,
  o: P,
): boolean => headingIsHorizontal(headingForPoint<P>(p, o));

// ---------------------------------------------------------------------------
// Element-based heading
// ---------------------------------------------------------------------------

/** Bounds center helper. */
const getCenterForBounds = (bounds: Readonly<Bounds>): GlobalPoint =>
  pointFrom<GlobalPoint>((bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2);

/**
 * Compute a shrunk diamond vertex: rotate, scale from center, return.
 */
const diamondVertex = (
  rawPoint: GlobalPoint,
  midPoint: GlobalPoint,
  angle: Radians,
  shrink: number,
): GlobalPoint =>
  pointFromVector(
    vectorScale(vectorFromPoint(pointRotateRads(rawPoint, midPoint, angle), midPoint), shrink),
    midPoint,
  );

/**
 * Test if a point falls inside a diamond corner zone defined by a vertex
 * and its two adjacent vertices. Uses cross-product half-plane tests.
 */
const isInCornerZone = (
  point: Readonly<GlobalPoint>,
  vertex: GlobalPoint,
  cwNeighbor: GlobalPoint,
  ccwNeighbor: GlobalPoint,
): boolean =>
  vectorCross(vectorFromPoint(point, vertex), vectorFromPoint(vertex, cwNeighbor)) <= 0 &&
  vectorCross(vectorFromPoint(point, vertex), vectorFromPoint(vertex, ccwNeighbor)) > 0;

/**
 * Test if a point falls inside a diamond side zone defined by two
 * adjacent vertices, relative to the center. Uses cross-product tests.
 */
const isInSideZone = (
  point: Readonly<GlobalPoint>,
  midPoint: GlobalPoint,
  cwVertex: GlobalPoint,
  ccwVertex: GlobalPoint,
): boolean =>
  vectorCross(vectorFromPoint(point, midPoint), vectorFromPoint(cwVertex, midPoint)) <= 0 &&
  vectorCross(vectorFromPoint(point, midPoint), vectorFromPoint(ccwVertex, midPoint)) > 0;

/**
 * Heading for a diamond element uses cross-product tests against the
 * diamond vertices (top, right, bottom, left) to determine which
 * quadrant the point is in.
 */
const headingForPointFromDiamondElement = (
  element: Readonly<{ x: number; y: number; width: number; height: number; angle: number }>,
  aabb: Readonly<Bounds>,
  point: Readonly<GlobalPoint>,
): Heading => {
  const midPoint = getCenterForBounds(aabb);
  const SHRINK = 0.95;
  const angle = element.angle as Radians;

  const top = diamondVertex(
    pointFrom<GlobalPoint>(element.x + element.width / 2, element.y),
    midPoint,
    angle,
    SHRINK,
  );
  const right = diamondVertex(
    pointFrom<GlobalPoint>(element.x + element.width, element.y + element.height / 2),
    midPoint,
    angle,
    SHRINK,
  );
  const bottom = diamondVertex(
    pointFrom<GlobalPoint>(element.x + element.width / 2, element.y + element.height),
    midPoint,
    angle,
    SHRINK,
  );
  const left = diamondVertex(
    pointFrom<GlobalPoint>(element.x, element.y + element.height / 2),
    midPoint,
    angle,
    SHRINK,
  );

  const cornerMatch = findDiamondCorner(point, midPoint, top, right, bottom, left);
  if (cornerMatch) return cornerMatch;

  return findDiamondSide(point, midPoint, element, top, right, bottom, left);
};

/**
 * Check each corner zone of the diamond and return the heading if the
 * point falls in one. Returns null if no corner matches.
 */
function findDiamondCorner(
  point: Readonly<GlobalPoint>,
  midPoint: GlobalPoint,
  top: GlobalPoint,
  right: GlobalPoint,
  bottom: GlobalPoint,
  left: GlobalPoint,
): Heading | null {
  // Each corner: [vertex, clockwise neighbor, counter-clockwise neighbor]
  const corners: [GlobalPoint, GlobalPoint, GlobalPoint][] = [
    [top, right, left],
    [right, bottom, top],
    [bottom, left, right],
    [left, top, bottom],
  ];

  for (const [vertex, cw, ccw] of corners) {
    if (isInCornerZone(point, vertex, cw, ccw)) {
      return headingForPoint(vertex, midPoint);
    }
  }

  return null;
}

/**
 * Determine heading from one of the four side zones of the diamond.
 * The wider dimension wins: width > height favors top/bottom, else left/right.
 */
function findDiamondSide(
  point: Readonly<GlobalPoint>,
  midPoint: GlobalPoint,
  element: Readonly<{ width: number; height: number }>,
  top: GlobalPoint,
  right: GlobalPoint,
  bottom: GlobalPoint,
  left: GlobalPoint,
): Heading {
  const isWide = element.width > element.height;

  // Each side: [clockwise vertex, counter-clockwise vertex, wide pick, narrow pick]
  const sides: [GlobalPoint, GlobalPoint, GlobalPoint, GlobalPoint][] = [
    [top, right, top, right],
    [right, bottom, bottom, right],
    [bottom, left, bottom, left],
  ];

  for (const [cw, ccw, wide, narrow] of sides) {
    if (isInSideZone(point, midPoint, cw, ccw)) {
      return headingForPoint(isWide ? wide : narrow, midPoint);
    }
  }

  // Fallback: last side zone (left-to-top)
  return headingForPoint(isWide ? top : left, midPoint);
}

/**
 * Determine which edge a point exits/enters from relative to an element.
 *
 * Creates a bounding box around the element, then uses 4 triangle
 * search cones (scaled by SEARCH_CONE_MULTIPLIER) from the center
 * to determine which quadrant the point falls in.
 *
 * For diamond elements, a separate algorithm using cross-product
 * tests against the diamond vertices is used.
 */
export const headingForPointFromElement = (
  element: Readonly<{
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
    angle: number;
  }>,
  aabb: Readonly<Bounds>,
  p: Readonly<GlobalPoint>,
): Heading => {
  if (element.type === "diamond") {
    return headingForPointFromDiamondElement(element, aabb, p);
  }

  const midPoint = getCenterForBounds(aabb);

  const topLeft = pointScaleFromOrigin(
    pointFrom(aabb[0], aabb[1]),
    midPoint,
    SEARCH_CONE_MULTIPLIER,
  ) as GlobalPoint;
  const topRight = pointScaleFromOrigin(
    pointFrom(aabb[2], aabb[1]),
    midPoint,
    SEARCH_CONE_MULTIPLIER,
  ) as GlobalPoint;
  const bottomLeft = pointScaleFromOrigin(
    pointFrom(aabb[0], aabb[3]),
    midPoint,
    SEARCH_CONE_MULTIPLIER,
  ) as GlobalPoint;
  const bottomRight = pointScaleFromOrigin(
    pointFrom(aabb[2], aabb[3]),
    midPoint,
    SEARCH_CONE_MULTIPLIER,
  ) as GlobalPoint;

  if (
    triangleIncludesPoint<GlobalPoint>([topLeft, topRight, midPoint] as Triangle<GlobalPoint>, p)
  ) {
    return HEADING_UP;
  }
  if (
    triangleIncludesPoint<GlobalPoint>(
      [topRight, bottomRight, midPoint] as Triangle<GlobalPoint>,
      p,
    )
  ) {
    return HEADING_RIGHT;
  }
  if (
    triangleIncludesPoint<GlobalPoint>(
      [bottomRight, bottomLeft, midPoint] as Triangle<GlobalPoint>,
      p,
    )
  ) {
    return HEADING_DOWN;
  }
  return HEADING_LEFT;
};
