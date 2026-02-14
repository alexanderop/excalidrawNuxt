import { randomVersionNonce } from "../../shared/random";
import type { ExcalidrawElement, MutableElement } from "./types";

export function mutateElement<T extends ExcalidrawElement>(
  element: T,
  updates: Partial<MutableElement> | Record<string, unknown>,
): T {
  Object.assign(element, updates, {
    versionNonce: randomVersionNonce(),
    version: (element.version ?? 0) + 1,
    updated: Date.now(),
  });
  return element;
}

/**
 * Update element position without bumping versionNonce,
 * so the shape cache isn't invalidated during drag.
 */
export function moveElement<T extends ExcalidrawElement>(element: T, x: number, y: number): T {
  Object.assign(element, { x, y });
  return element;
}
