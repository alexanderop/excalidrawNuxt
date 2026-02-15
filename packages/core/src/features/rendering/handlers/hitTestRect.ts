import type { ExcalidrawElement } from "../../elements/types";
import type { GlobalPoint, Radians } from "../../../shared/math";
import { pointFrom, pointRotateRads } from "../../../shared/math";

/**
 * Shared rectangular hit test used by rectangle, text, and image handlers.
 * Unrotates the point around the element center, then checks axis-aligned
 * bounds expanded by the threshold.
 */
export function hitTestRectangular(
  point: GlobalPoint,
  element: ExcalidrawElement,
  threshold: number,
): boolean {
  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;
  const rotated = pointRotateRads(point, pointFrom<GlobalPoint>(cx, cy), -element.angle as Radians);

  return (
    rotated[0] >= element.x - threshold &&
    rotated[0] <= element.x + element.width + threshold &&
    rotated[1] >= element.y - threshold &&
    rotated[1] <= element.y + element.height + threshold
  );
}
