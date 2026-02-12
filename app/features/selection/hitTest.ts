import type { ExcalidrawElement } from "~/features/elements/types";
import { isLinearElement, isFreeDrawElement } from "~/features/elements/types";
import {
  pointFrom,
  pointRotateRads,
  lineSegment,
  distanceToLineSegment,
  polygonFromPoints,
  polygonIncludesPoint,
  pointOnPolygon,
} from "~/shared/math";
import type { GlobalPoint, Radians } from "~/shared/math";
import { getElementBounds } from "./bounds";

export function getHitThreshold(element: ExcalidrawElement, zoom: number): number {
  return Math.max(element.strokeWidth / 2 + 0.1, 10 / zoom);
}

export function hitTest(point: GlobalPoint, element: ExcalidrawElement, zoom: number): boolean {
  if (element.isDeleted) return false;

  const threshold = getHitThreshold(element, zoom);

  // Phase 1: fast bounding box reject
  const [x1, y1, x2, y2] = getElementBounds(element);
  if (
    point[0] < x1 - threshold ||
    point[0] > x2 + threshold ||
    point[1] < y1 - threshold ||
    point[1] > y2 + threshold
  ) {
    return false;
  }

  // Phase 2: precise shape test
  return hitTestShape(point, element, threshold);
}

function hitTestShape(point: GlobalPoint, element: ExcalidrawElement, threshold: number): boolean {
  if (isFreeDrawElement(element) || isLinearElement(element)) {
    return hitTestPolyline(point, element, threshold);
  }
  switch (element.type) {
    case "rectangle":
    case "text":
    case "image": {
      return hitTestRectangle(point, element, threshold);
    }
    case "ellipse": {
      return hitTestEllipse(point, element, threshold);
    }
    case "diamond": {
      return hitTestDiamond(point, element, threshold);
    }
    default: {
      return false;
    }
  }
}

export function getElementAtPosition(
  scenePoint: GlobalPoint,
  elements: readonly ExcalidrawElement[],
  zoom: number,
): ExcalidrawElement | null {
  // Iterate back-to-front (topmost = last in array)
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (!el) continue;
    if (el.isDeleted) continue;
    // Skip bound text — clicking it should hit the container behind it
    if (el.type === "text" && "containerId" in el && el.containerId) continue;
    if (hitTest(scenePoint, el, zoom)) return el;
  }
  return null;
}

function hitTestRectangle(point: GlobalPoint, el: ExcalidrawElement, threshold: number): boolean {
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  const rotated = pointRotateRads(point, pointFrom<GlobalPoint>(cx, cy), -el.angle as Radians);

  return (
    rotated[0] >= el.x - threshold &&
    rotated[0] <= el.x + el.width + threshold &&
    rotated[1] >= el.y - threshold &&
    rotated[1] <= el.y + el.height + threshold
  );
}

function hitTestEllipse(point: GlobalPoint, el: ExcalidrawElement, threshold: number): boolean {
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  const rotated = pointRotateRads(point, pointFrom<GlobalPoint>(cx, cy), -el.angle as Radians);

  const rx = el.width / 2;
  const ry = el.height / 2;
  const dx = rotated[0] - cx;
  const dy = rotated[1] - cy;

  const outerRx = rx + threshold;
  const outerRy = ry + threshold;
  return (dx * dx) / (outerRx * outerRx) + (dy * dy) / (outerRy * outerRy) <= 1;
}

function hitTestDiamond(point: GlobalPoint, el: ExcalidrawElement, threshold: number): boolean {
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  const rotated = pointRotateRads(point, pointFrom<GlobalPoint>(cx, cy), -el.angle as Radians);

  const vertices: GlobalPoint[] = [
    pointFrom<GlobalPoint>(cx, el.y),
    pointFrom<GlobalPoint>(el.x + el.width, cy),
    pointFrom<GlobalPoint>(cx, el.y + el.height),
    pointFrom<GlobalPoint>(el.x, cy),
  ];

  return isPointInPolygon(rotated, vertices, threshold);
}

function isPointInPolygon(point: GlobalPoint, vertices: GlobalPoint[], threshold: number): boolean {
  const poly = polygonFromPoints<GlobalPoint>(vertices);
  if (polygonIncludesPoint(point, poly)) return true;
  return pointOnPolygon(point, poly, threshold);
}

function hitTestPolyline(
  point: GlobalPoint,
  el: ExcalidrawElement & { points: readonly { 0: number; 1: number }[] },
  threshold: number,
): boolean {
  const pts = el.points.map((p) => pointFrom<GlobalPoint>(p[0] + el.x, p[1] + el.y));
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (!a || !b) continue;
    if (distanceToLineSegment(point, lineSegment(a, b)) <= threshold) return true;
  }
  return false;
}
