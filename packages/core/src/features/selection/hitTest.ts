import type { ExcalidrawElement } from "../elements/types";
import type { GlobalPoint } from "../../shared/math";
import { getElementBounds } from "./bounds";
import { shapeRegistry } from "../../shared/shapeRegistry";

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

  // Phase 2: precise shape test via handler
  const handler = shapeRegistry.getHandler(element);
  return handler.hitTest(point, element, threshold);
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
