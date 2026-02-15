import { pointFrom, pointRotateRads } from "../../shared/math";
import type { GlobalPoint, Radians } from "../../shared/math";
import type { ExcalidrawElement } from "../elements/types";
import { isBindableElement } from "./types";
import type { BindableElement, BindingMode } from "./types";
import { BASE_BINDING_GAP, maxBindingDistance } from "./constants";
import { shapeRegistry } from "../../shared/shapeRegistry";
import { isBindableHandler } from "../../shared/shapeHandlerRegistry";

interface BindingCandidate {
  element: BindableElement;
  fixedPoint: readonly [number, number];
}

/**
 * Unrotate a scene point around the element's center so that all
 * subsequent geometry operates in axis-aligned (local) space.
 */
function unrotateAroundCenter(point: GlobalPoint, element: BindableElement): GlobalPoint {
  if (element.angle === 0) return point;

  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;
  return pointRotateRads(point, pointFrom<GlobalPoint>(cx, cy), -element.angle as Radians);
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
  const unrotated = unrotateAroundCenter(point, element);
  const handler = shapeRegistry.getHandler(element);
  if (!isBindableHandler(handler)) {
    throw new Error(`No bindable handler for type: ${element.type}`);
  }
  return handler.distanceToEdge(element, unrotated);
}

/**
 * Check whether a scene point is inside a shape (accounting for rotation).
 */
export function isPointInsideShape(point: GlobalPoint, element: BindableElement): boolean {
  const unrotated = unrotateAroundCenter(point, element);
  const handler = shapeRegistry.getHandler(element);
  if (!isBindableHandler(handler)) return false;
  return handler.isPointInside(element, unrotated);
}

/**
 * Compute the fixedPoint (0-1 ratio on shape bbox) for a given scene point.
 */
export function computeFixedPoint(
  point: GlobalPoint,
  element: BindableElement,
): readonly [number, number] {
  const unrotated = unrotateAroundCenter(point, element);

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
  const handler = shapeRegistry.getHandler(element);
  if (!isBindableHandler(handler)) {
    throw new Error(`No bindable handler for type: ${element.type}`);
  }
  return handler.projectOntoEdge(element, cx, cy, dirX, dirY);
}
