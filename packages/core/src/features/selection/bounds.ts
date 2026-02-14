import type { ExcalidrawElement } from "../elements/types";
import { isLinearElement, isFreeDrawElement } from "../elements/types";
import { pointFrom, pointRotateRads } from "../../shared/math";
import type { GlobalPoint } from "../../shared/math";

export type Bounds = [x1: number, y1: number, x2: number, y2: number];

interface PointBasedElement {
  x: number;
  y: number;
  points: readonly { 0: number; 1: number }[];
}

function getPointBasedBounds(element: PointBasedElement): Bounds {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const p of element.points) {
    const px = p[0] + element.x;
    const py = p[1] + element.y;
    if (px < minX) minX = px;
    if (py < minY) minY = py;
    if (px > maxX) maxX = px;
    if (py > maxY) maxY = py;
  }
  return [minX, minY, maxX, maxY];
}

export function getElementBounds(element: ExcalidrawElement): Bounds {
  if (isFreeDrawElement(element) || isLinearElement(element)) {
    return getPointBasedBounds(element);
  }

  const { x, y, width, height, angle } = element;

  if (angle === 0) {
    return [x, y, x + width, y + height];
  }

  const cx = x + width / 2;
  const cy = y + height / 2;
  const center = pointFrom<GlobalPoint>(cx, cy);
  const rads = angle;

  const corners: GlobalPoint[] = [
    pointFrom<GlobalPoint>(x, y),
    pointFrom<GlobalPoint>(x + width, y),
    pointFrom<GlobalPoint>(x + width, y + height),
    pointFrom<GlobalPoint>(x, y + height),
  ];

  const rotated = corners.map((p) => pointRotateRads(p, center, rads));

  const xs = rotated.map((p) => p[0]);
  const ys = rotated.map((p) => p[1]);

  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

export function getCommonBounds(elements: readonly ExcalidrawElement[]): Bounds | null {
  if (elements.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const el of elements) {
    const [x1, y1, x2, y2] = getElementBounds(el);
    if (x1 < minX) minX = x1;
    if (y1 < minY) minY = y1;
    if (x2 > maxX) maxX = x2;
    if (y2 > maxY) maxY = y2;
  }

  return [minX, minY, maxX, maxY];
}
