import type { ExcalidrawElement, ExcalidrawArrowElement } from "../elements/types";
import { isArrowElement, isFixedPointBinding } from "../elements/types";
import { mutateElement } from "../elements/mutateElement";
import { pointFrom } from "../../shared/math";
import type { LocalPoint } from "../../shared/math";
import { normalizePoints, getSizeFromPoints } from "../linear-editor/pointHandles";
import { isBindableElement } from "./types";
import type { BindableElement } from "./types";
import { getPointFromFixedPoint } from "./proximity";
import { findBindableElement } from "./bindUnbind";

/**
 * Update all arrow endpoints bound to a shape.
 * Call this after moving or resizing a shape.
 */
export function updateBoundArrowEndpoints(
  shape: ExcalidrawElement,
  elements: readonly ExcalidrawElement[],
): void {
  if (!isBindableElement(shape)) return;
  const bound = shape.boundElements ?? [];
  if (bound.length === 0) return;

  for (const entry of bound) {
    updateBoundArrowForShape(entry, shape, elements);
  }
}

function updateBoundArrowForShape(
  entry: { id: string },
  shape: BindableElement,
  elements: readonly ExcalidrawElement[],
): void {
  const arrow = elements.find((el) => el.id === entry.id);
  if (!arrow || !isArrowElement(arrow)) return;

  if (arrow.startBinding?.elementId === shape.id) {
    updateArrowEndpoint(arrow, "start", shape);
  }
  if (arrow.endBinding?.elementId === shape.id) {
    updateArrowEndpoint(arrow, "end", shape);
  }
}

/**
 * Update a single arrow endpoint to snap to the bound shape's edge.
 */
export function updateArrowEndpoint(
  arrow: ExcalidrawArrowElement,
  endpoint: "start" | "end",
  target: BindableElement,
): void {
  const binding = endpoint === "start" ? arrow.startBinding : arrow.endBinding;
  if (!binding) return;

  if (!isFixedPointBinding(binding)) return;
  const { fixedPoint } = binding;

  const scenePoint = getPointFromFixedPoint(fixedPoint, target);
  const pointIndex = endpoint === "start" ? 0 : arrow.points.length - 1;
  const relativePoint = pointFrom<LocalPoint>(scenePoint[0] - arrow.x, scenePoint[1] - arrow.y);

  const newPoints = arrow.points.map((p, i) => (i === pointIndex ? relativePoint : p));

  const normalized = normalizePoints(arrow.x, arrow.y, newPoints);
  const dims = getSizeFromPoints(normalized.points);

  mutateElement(arrow, {
    x: normalized.x,
    y: normalized.y,
    points: normalized.points,
    width: dims.width,
    height: dims.height,
  });
}

/**
 * Update both endpoints of an arrow based on their bindings.
 */
export function updateArrowBindings(
  arrow: ExcalidrawArrowElement,
  elements: readonly ExcalidrawElement[],
): void {
  if (arrow.startBinding) {
    const target = findBindableElement(arrow.startBinding.elementId, elements);
    if (target) updateArrowEndpoint(arrow, "start", target);
  }
  if (arrow.endBinding) {
    const target = findBindableElement(arrow.endBinding.elementId, elements);
    if (target) updateArrowEndpoint(arrow, "end", target);
  }
}
