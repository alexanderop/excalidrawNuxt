import {
  pointFrom,
  pointRotateRads,
  lineSegment,
  distanceToLineSegment,
  ellipse,
  ellipseDistanceFromPoint,
} from "../../shared/math";
import type { GlobalPoint, Radians } from "../../shared/math";
import type { ExcalidrawElement } from "../elements/types";
import { isBindableElement } from "./types";
import type { BindableElement, BindingMode } from "./types";
import { BASE_BINDING_GAP, maxBindingDistance } from "./constants";

interface BindingCandidate {
  element: BindableElement;
  fixedPoint: readonly [number, number];
}

/**
 * Find the closest bindable shape within proximity threshold.
 * A point qualifies if it is INSIDE the shape or within the binding
 * distance of its edge (matching Excalidraw's bindingBorderTest).
 * Returns the element and the normalized fixedPoint (0-1 ratio on bbox).
 */
export function getHoveredElementForBinding(
  point: GlobalPoint,
  elements: readonly ExcalidrawElement[],
  zoom: number,
  excludeIds: ReadonlySet<string>,
): BindingCandidate | null {
  const threshold = maxBindingDistance(zoom);
  let closest: BindingCandidate | null = null;
  let closestDist = Infinity;

  for (const el of elements) {
    if (el.isDeleted) continue;
    if (!isBindableElement(el)) continue;
    if (excludeIds.has(el.id)) continue;

    const inside = isPointInsideShape(point, el);
    const dist = distanceToShapeEdge(point, el);

    // Accept if point is inside the shape OR within binding distance of its edge
    if ((inside || dist <= threshold) && dist < closestDist) {
      closestDist = dist;
      closest = {
        element: el,
        fixedPoint: computeFixedPoint(point, el),
      };
    }
  }

  return closest;
}

/**
 * Distance from a point to the nearest edge of a shape.
 * Handles rotation by unrotating the point around the shape center.
 */
export function distanceToShapeEdge(point: GlobalPoint, element: BindableElement): number {
  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;
  const unrotated =
    element.angle === 0
      ? point
      : pointRotateRads(point, pointFrom<GlobalPoint>(cx, cy), -element.angle as Radians);

  if (element.type === "rectangle") {
    return distanceToRectangleEdge(unrotated, element);
  }
  if (element.type === "ellipse") {
    return distanceToEllipseEdge(unrotated, element);
  }
  if (element.type === "diamond") {
    return distanceToDiamondEdge(unrotated, element);
  }

  throw new Error(`Unhandled element type: ${(element as { type: string }).type}`);
}

function distanceToRectangleEdge(point: GlobalPoint, el: BindableElement): number {
  const { x, y, width, height } = el;
  const edges: [GlobalPoint, GlobalPoint][] = [
    [pointFrom<GlobalPoint>(x, y), pointFrom<GlobalPoint>(x + width, y)],
    [pointFrom<GlobalPoint>(x + width, y), pointFrom<GlobalPoint>(x + width, y + height)],
    [pointFrom<GlobalPoint>(x + width, y + height), pointFrom<GlobalPoint>(x, y + height)],
    [pointFrom<GlobalPoint>(x, y + height), pointFrom<GlobalPoint>(x, y)],
  ];
  let minDist = Infinity;
  for (const [a, b] of edges) {
    const d = distanceToLineSegment(point, lineSegment(a, b));
    if (d < minDist) minDist = d;
  }
  return minDist;
}

function distanceToEllipseEdge(point: GlobalPoint, el: BindableElement): number {
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  const rx = el.width / 2;
  const ry = el.height / 2;

  if (rx === 0 || ry === 0) return Math.hypot(point[0] - cx, point[1] - cy);

  const e = ellipse(pointFrom<GlobalPoint>(cx, cy), rx, ry);
  return ellipseDistanceFromPoint(point, e);
}

function distanceToDiamondEdge(point: GlobalPoint, el: BindableElement): number {
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  const vertices: GlobalPoint[] = [
    pointFrom<GlobalPoint>(cx, el.y),
    pointFrom<GlobalPoint>(el.x + el.width, cy),
    pointFrom<GlobalPoint>(cx, el.y + el.height),
    pointFrom<GlobalPoint>(el.x, cy),
  ];
  let minDist = Infinity;
  for (let i = 0; i < 4; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % 4];
    if (!a || !b) continue;
    const d = distanceToLineSegment(point, lineSegment(a, b));
    if (d < minDist) minDist = d;
  }
  return minDist;
}

/**
 * Check whether a scene point is inside a shape (accounting for rotation).
 */
export function isPointInsideShape(point: GlobalPoint, element: BindableElement): boolean {
  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;
  const unrotated =
    element.angle === 0
      ? point
      : pointRotateRads(point, pointFrom<GlobalPoint>(cx, cy), -element.angle as Radians);

  if (element.type === "rectangle") {
    return isPointInsideRectangle(unrotated, element);
  }
  if (element.type === "ellipse") {
    return isPointInsideEllipse(unrotated, element, cx, cy);
  }
  if (element.type === "diamond") {
    return isPointInsideDiamond(unrotated, element, cx, cy);
  }

  return false;
}

function isPointInsideRectangle(point: GlobalPoint, el: BindableElement): boolean {
  return (
    point[0] >= el.x &&
    point[0] <= el.x + el.width &&
    point[1] >= el.y &&
    point[1] <= el.y + el.height
  );
}

function isPointInsideEllipse(
  point: GlobalPoint,
  el: BindableElement,
  cx: number,
  cy: number,
): boolean {
  const rx = el.width / 2;
  const ry = el.height / 2;
  if (rx === 0 || ry === 0) return false;
  const dx = (point[0] - cx) / rx;
  const dy = (point[1] - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

function isPointInsideDiamond(
  point: GlobalPoint,
  el: BindableElement,
  cx: number,
  cy: number,
): boolean {
  const hw = el.width / 2;
  const hh = el.height / 2;
  if (hw === 0 || hh === 0) return false;
  const dx = Math.abs(point[0] - cx) / hw;
  const dy = Math.abs(point[1] - cy) / hh;
  return dx + dy <= 1;
}

/**
 * Compute the fixedPoint (0-1 ratio on shape bbox) for a given scene point.
 */
export function computeFixedPoint(
  point: GlobalPoint,
  element: BindableElement,
): readonly [number, number] {
  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;
  const unrotated =
    element.angle === 0
      ? point
      : pointRotateRads(point, pointFrom<GlobalPoint>(cx, cy), -element.angle as Radians);

  const w = element.width || 1;
  const h = element.height || 1;
  const ratioX = (unrotated[0] - element.x) / w;
  const ratioY = (unrotated[1] - element.y) / h;

  return [Math.max(0, Math.min(1, ratioX)), Math.max(0, Math.min(1, ratioY))];
}

/**
 * Convert a fixedPoint back to scene coordinates.
 *
 * - mode 'orbit' (default): projects from center through fixedPoint onto
 *   the shape edge, then offsets outward by BASE_BINDING_GAP.
 * - mode 'inside': returns the fixedPoint's scene coordinate directly
 *   (no edge projection, no gap offset).
 */
export function getPointFromFixedPoint(
  fixedPoint: readonly [number, number],
  element: BindableElement,
  mode: BindingMode = "orbit",
): GlobalPoint {
  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;

  // Fixed point in local (unrotated) space
  const targetX = element.x + fixedPoint[0] * element.width;
  const targetY = element.y + fixedPoint[1] * element.height;

  if (mode === "inside") {
    // Return the scene coordinate directly — no edge projection, no gap
    if (element.angle !== 0) {
      return pointRotateRads(
        pointFrom<GlobalPoint>(targetX, targetY),
        pointFrom<GlobalPoint>(cx, cy),
        element.angle as Radians,
      );
    }
    return pointFrom<GlobalPoint>(targetX, targetY);
  }

  // --- orbit mode (default) ---

  // Direction from center to target
  const dx = targetX - cx;
  const dy = targetY - cy;
  const len = Math.hypot(dx, dy);

  // Default to right edge if fixedPoint is exactly at center
  const edgePoint =
    len === 0
      ? projectOntoShapeEdge(cx, cy, 1, 0, element)
      : projectOntoShapeEdge(cx, cy, dx / len, dy / len, element);

  // Offset outward by gap
  const edgeDx = edgePoint[0] - cx;
  const edgeDy = edgePoint[1] - cy;
  const edgeLen = Math.hypot(edgeDx, edgeDy);
  const gap = BASE_BINDING_GAP;
  const result: GlobalPoint =
    edgeLen === 0
      ? edgePoint
      : pointFrom<GlobalPoint>(
          edgePoint[0] + (edgeDx / edgeLen) * gap,
          edgePoint[1] + (edgeDy / edgeLen) * gap,
        );

  // Re-rotate if element is rotated
  if (element.angle !== 0) {
    return pointRotateRads(result, pointFrom<GlobalPoint>(cx, cy), element.angle as Radians);
  }
  return result;
}

/**
 * Project from center along a normalized direction onto the shape edge.
 */
function projectOntoShapeEdge(
  cx: number,
  cy: number,
  dirX: number,
  dirY: number,
  element: BindableElement,
): GlobalPoint {
  if (element.type === "rectangle") {
    return projectOntoRectEdge(cx, cy, dirX, dirY, element);
  }
  if (element.type === "ellipse") {
    return projectOntoEllipseEdge(cx, cy, dirX, dirY, element);
  }
  if (element.type === "diamond") {
    return projectOntoDiamondEdge(cx, cy, dirX, dirY, element);
  }

  throw new Error(`Unhandled element type: ${(element as { type: string }).type}`);
}

function projectOntoRectEdge(
  cx: number,
  cy: number,
  dirX: number,
  dirY: number,
  el: BindableElement,
): GlobalPoint {
  const hw = el.width / 2;
  const hh = el.height / 2;

  // Find the intersection of ray from center with rect edges
  let t = Infinity;
  if (dirX !== 0) {
    const tx = (dirX > 0 ? hw : -hw) / dirX;
    if (tx > 0) t = Math.min(t, tx);
  }
  if (dirY !== 0) {
    const ty = (dirY > 0 ? hh : -hh) / dirY;
    if (ty > 0) t = Math.min(t, ty);
  }

  if (!Number.isFinite(t)) return pointFrom<GlobalPoint>(cx, cy);

  return pointFrom<GlobalPoint>(cx + dirX * t, cy + dirY * t);
}

function projectOntoEllipseEdge(
  cx: number,
  cy: number,
  dirX: number,
  dirY: number,
  el: BindableElement,
): GlobalPoint {
  const rx = el.width / 2;
  const ry = el.height / 2;
  if (rx === 0 || ry === 0) return pointFrom<GlobalPoint>(cx, cy);

  // Parametric: point on ellipse at angle = (rx*cos, ry*sin)
  const angle = Math.atan2(dirY, dirX);
  return pointFrom<GlobalPoint>(cx + rx * Math.cos(angle), cy + ry * Math.sin(angle));
}

function projectOntoDiamondEdge(
  cx: number,
  cy: number,
  dirX: number,
  dirY: number,
  el: BindableElement,
): GlobalPoint {
  const hw = el.width / 2;
  const hh = el.height / 2;

  // Diamond vertices relative to center: top(0,-hh), right(hw,0), bottom(0,hh), left(-hw,0)
  const vertices: GlobalPoint[] = [
    pointFrom<GlobalPoint>(0, -hh),
    pointFrom<GlobalPoint>(hw, 0),
    pointFrom<GlobalPoint>(0, hh),
    pointFrom<GlobalPoint>(-hw, 0),
  ];

  let closestT = Infinity;
  for (let i = 0; i < 4; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % 4];
    if (!a || !b) continue;
    // Ray-segment intersection
    const t = raySegmentIntersection(dirX, dirY, a, b);
    if (t !== null && t > 0 && t < closestT) {
      closestT = t;
    }
  }

  if (!Number.isFinite(closestT)) return pointFrom<GlobalPoint>(cx, cy);

  return pointFrom<GlobalPoint>(cx + dirX * closestT, cy + dirY * closestT);
}

/**
 * Intersect ray (origin=0, dir) with segment (a, b).
 * Returns parameter t along ray, or null if no intersection.
 */
function raySegmentIntersection(
  dirX: number,
  dirY: number,
  a: GlobalPoint,
  b: GlobalPoint,
): number | null {
  const edgeX = b[0] - a[0];
  const edgeY = b[1] - a[1];
  const denom = dirX * edgeY - dirY * edgeX;

  if (Math.abs(denom) < 1e-10) return null;

  const t = (a[0] * edgeY - a[1] * edgeX) / denom;
  const u = (a[0] * dirY - a[1] * dirX) / denom;

  if (u >= 0 && u <= 1 && t > 0) return t;
  return null;
}
