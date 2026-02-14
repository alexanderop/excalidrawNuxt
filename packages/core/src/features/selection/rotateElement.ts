import { mutateElement } from "../elements/mutateElement";
import { normalizeRadians } from "../../shared/math";
import type { ExcalidrawElement } from "../elements/types";
import type { GlobalPoint, Radians } from "../../shared/math";

const SHIFT_LOCKING_ANGLE = Math.PI / 12; // 15 degrees

/**
 * Compute element rotation from pointer position.
 *
 * The angle is derived from the pointer's position relative to the element
 * center using atan2, with a 5π/2 offset so 0 radians points upward
 * (12 o'clock — where the rotation handle lives).
 *
 * Follows the same algorithm as Excalidraw's `rotateSingleElement`.
 */
export function rotateElement(
  scenePoint: GlobalPoint,
  element: ExcalidrawElement,
  shiftKey: boolean,
): void {
  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;

  let angle = normalizeRadians(
    ((5 * Math.PI) / 2 + Math.atan2(scenePoint[1] - cy, scenePoint[0] - cx)) as Radians,
  );

  if (shiftKey) {
    angle = normalizeRadians(
      (Math.round(angle / SHIFT_LOCKING_ANGLE) * SHIFT_LOCKING_ANGLE) as Radians,
    );
  }

  mutateElement(element, { angle });
}
