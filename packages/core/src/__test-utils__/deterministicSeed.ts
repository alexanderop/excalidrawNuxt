import { reseed as excalidrawReseed } from "@excalidraw/common";

function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d_2b_79_f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

let originalRandom: (() => number) | null = null;
let counter = 0;

export function reseed(seed = 12_345): void {
  originalRandom = Math.random;
  const rng = mulberry32(seed);
  Math.random = rng;
  excalidrawReseed(seed);
  counter = 0;
}

export function deterministicId(): string {
  return `test-id-${counter++}`;
}

export function restoreSeed(): void {
  if (originalRandom) {
    Math.random = originalRandom;
    originalRandom = null;
  }
  counter = 0;
}
