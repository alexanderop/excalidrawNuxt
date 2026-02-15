import type { ExcalidrawElement, ExcalidrawArrowElement, ElementsMap } from "../elements/types";
import { isArrowElement, isFixedPointBinding } from "../elements/types";
import { arrayToMap } from "../elements";
import { mutateElement } from "../elements/mutateElement";
import { pointFrom } from "../../shared/math";
import type { LocalPoint } from "../../shared/math";
import { normalizePoints, getSizeFromPoints } from "../linear-editor/pointHandles";
import { isBindableElement } from "./types";
import type { BindableElement, BindingMode } from "./types";
import { getPointFromFixedPoint } from "./proximity";
import { findBindableElement } from "./bindUnbind";
import { SHORT_ARROW_THRESHOLD } from "./constants";
import { updateBoundTextOnArrow } from "./boundText";

/** Safely extract the optional `mode` field from a binding that may carry it. */
function getBindingMode(binding: object): BindingMode | undefined {
  if (!("mode" in binding)) return undefined;
  const { mode } = binding as { mode: unknown };
  if (mode === "orbit" || mode === "inside") return mode;
  return undefined;
}

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

  const modeOverride = getShortArrowModeOverride(arrow, elements);

  if (arrow.startBinding?.elementId === shape.id) {
    updateArrowEndpoint(arrow, "start", shape, modeOverride);
  }
  if (arrow.endBinding?.elementId === shape.id) {
    updateArrowEndpoint(arrow, "end", shape, modeOverride);
  }

  repositionBoundText(arrow, elements);
}

/**
 * When both arrow endpoints are bound and the two target shapes are very
 * close together, switch to 'inside' mode so the arrow doesn't overshoot.
 */
function getShortArrowModeOverride(
  arrow: ExcalidrawArrowElement,
  elements: readonly ExcalidrawElement[],
): BindingMode | undefined {
  if (!arrow.startBinding || !arrow.endBinding) return undefined;

  const startTarget = findBindableElement(arrow.startBinding.elementId, elements);
  const endTarget = findBindableElement(arrow.endBinding.elementId, elements);
  if (!startTarget || !endTarget) return undefined;

  const startCx = startTarget.x + startTarget.width / 2;
  const startCy = startTarget.y + startTarget.height / 2;
  const endCx = endTarget.x + endTarget.width / 2;
  const endCy = endTarget.y + endTarget.height / 2;
  const centerDist = Math.hypot(endCx - startCx, endCy - startCy);

  if (centerDist < SHORT_ARROW_THRESHOLD) return "inside";

  return undefined;
}

/**
 * Update a single arrow endpoint to snap to the bound shape's edge.
 * An optional `modeOverride` forces a specific binding mode regardless
 * of what is stored on the binding object.
 */
export function updateArrowEndpoint(
  arrow: ExcalidrawArrowElement,
  endpoint: "start" | "end",
  target: BindableElement,
  modeOverride?: BindingMode,
): void {
  const binding = endpoint === "start" ? arrow.startBinding : arrow.endBinding;
  if (!binding) return;

  if (!isFixedPointBinding(binding)) return;
  const { fixedPoint } = binding;

  const mode = modeOverride ?? getBindingMode(binding) ?? "orbit";
  const scenePoint = getPointFromFixedPoint(fixedPoint, target, mode);
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
  const modeOverride = getShortArrowModeOverride(arrow, elements);

  if (arrow.startBinding) {
    const target = findBindableElement(arrow.startBinding.elementId, elements);
    if (target) updateArrowEndpoint(arrow, "start", target, modeOverride);
  }
  if (arrow.endBinding) {
    const target = findBindableElement(arrow.endBinding.elementId, elements);
    if (target) updateArrowEndpoint(arrow, "end", target, modeOverride);
  }

  repositionBoundText(arrow, elements);
}

/** Reposition any bound text label after arrow endpoints changed. */
function repositionBoundText(
  arrow: ExcalidrawArrowElement,
  elements: readonly ExcalidrawElement[],
): void {
  const elementMap = arrayToMap(elements) as unknown as ElementsMap;
  updateBoundTextOnArrow(arrow, elementMap);
}
