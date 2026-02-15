import {
  doBoundsIntersect,
  getElementBounds as getUpstreamElementBounds,
  getElementLineSegments,
  intersectElementWithLineSegment,
  isPointInElement,
  shouldTestInside,
} from "@excalidraw/element";
import type { ElementsMap, ExcalidrawElement } from "../elements/types";
import { isFreeDrawElement, isLinearElement } from "../elements/types";
import { lineSegment, pointFrom, distanceToLineSegment } from "../../shared/math";
import type { GlobalPoint, LineSegment } from "../../shared/math";
import type { Bounds } from "../selection/bounds";

/**
 * Minimum distance between two line segments.
 * Checks distance from each endpoint of one segment to the other segment.
 */
function lineSegmentsDistance(
  seg1: LineSegment<GlobalPoint>,
  seg2: LineSegment<GlobalPoint>,
): number {
  const d1 = distanceToLineSegment(seg1[0], seg2);
  const d2 = distanceToLineSegment(seg1[1], seg2);
  const d3 = distanceToLineSegment(seg2[0], seg1);
  const d4 = distanceToLineSegment(seg2[1], seg1);
  return Math.min(d1, d2, d3, d4);
}

function getHitThreshold(element: ExcalidrawElement, zoom: number): number {
  if (isFreeDrawElement(element)) return Math.max(2.25, 5 / zoom);
  if (isLinearElement(element))
    return Math.max(element.strokeWidth, (element.strokeWidth * 2) / zoom);
  return element.strokeWidth / 2;
}

function boundsOverlap(
  pathSegment: LineSegment<GlobalPoint>,
  element: ExcalidrawElement,
  elementsMap: ElementsMap,
  zoom: number,
): boolean {
  const threshold = getHitThreshold(element, zoom);
  const segmentBounds: Bounds = [
    Math.min(pathSegment[0][0], pathSegment[1][0]) - threshold,
    Math.min(pathSegment[0][1], pathSegment[1][1]) - threshold,
    Math.max(pathSegment[0][0], pathSegment[1][0]) + threshold,
    Math.max(pathSegment[0][1], pathSegment[1][1]) + threshold,
  ];

  const origBounds = getUpstreamElementBounds(element, elementsMap);
  const elementBounds: Bounds = [
    origBounds[0] - threshold,
    origBounds[1] - threshold,
    origBounds[2] + threshold,
    origBounds[3] + threshold,
  ];

  return doBoundsIntersect(segmentBounds, elementBounds);
}

function testLinearElement(
  pathSegment: LineSegment<GlobalPoint>,
  element: ExcalidrawElement,
  elementsMap: ElementsMap,
  zoom: number,
): boolean {
  const tolerance = getHitThreshold(element, zoom);
  const segments = getElementLineSegments(element, elementsMap);
  for (const seg of segments) {
    if (lineSegmentsDistance(seg as LineSegment<GlobalPoint>, pathSegment) <= tolerance) {
      return true;
    }
  }
  return false;
}

function testFreeDrawElement(
  pathSegment: LineSegment<GlobalPoint>,
  element: ExcalidrawElement & { points: readonly { 0: number; 1: number }[] },
  zoom: number,
): boolean {
  const tolerance = getHitThreshold(element, zoom);
  const pts = element.points.map((p) => pointFrom<GlobalPoint>(p[0] + element.x, p[1] + element.y));
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (!a || !b) continue;
    const seg = lineSegment<GlobalPoint>(a, b);
    if (lineSegmentsDistance(seg, pathSegment) <= tolerance) {
      return true;
    }
  }
  return false;
}

/**
 * Test whether a line segment from the eraser trail intersects an element.
 *
 * Uses a multi-phase approach:
 * 1. Fast bounding-box reject
 * 2. Point-in-element for filled shapes
 * 3. Shape-specific intersection
 */
export function eraserTest(
  pathSegment: LineSegment<GlobalPoint>,
  element: ExcalidrawElement,
  elementsMap: ElementsMap,
  zoom: number,
): boolean {
  if (element.isDeleted) return false;
  if (!boundsOverlap(pathSegment, element, elementsMap, zoom)) return false;

  // Interior check for filled shapes
  if (shouldTestInside(element) && isPointInElement(pathSegment[1], element, elementsMap)) {
    return true;
  }

  if (isLinearElement(element)) {
    return testLinearElement(pathSegment, element, elementsMap, zoom);
  }

  if (isFreeDrawElement(element)) {
    return testFreeDrawElement(pathSegment, element, zoom);
  }

  // Shapes (rectangle, ellipse, diamond, text, image)
  return intersectElementWithLineSegment(element, elementsMap, pathSegment, 0, true).length > 0;
}
