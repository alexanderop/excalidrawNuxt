import { randomInteger } from "@excalidraw/common";

export function randomVersionNonce(): number {
  return randomInteger();
}

export { randomId as generateId, randomInteger } from "@excalidraw/common";
