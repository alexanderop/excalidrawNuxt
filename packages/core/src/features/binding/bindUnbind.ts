import type {
  ExcalidrawElement,
  ExcalidrawArrowElement,
  FixedPointBinding,
} from "../elements/types";
import { isArrowElement } from "../elements/types";
import { mutateElement } from "../elements/mutateElement";
import type { BindableElement, BindingEndpoint } from "./types";
import { isBindableElement } from "./types";

/**
 * Bind one endpoint of an arrow to a target shape.
 * Mutates both the arrow (sets binding) and the shape (adds to boundElements).
 */
export function bindArrowToElement(
  arrow: ExcalidrawArrowElement,
  endpoint: BindingEndpoint,
  target: BindableElement,
  fixedPoint: readonly [number, number],
): void {
  const binding: FixedPointBinding = {
    elementId: target.id,
    fixedPoint: [fixedPoint[0], fixedPoint[1]],
    focus: 0,
    gap: 0,
  };

  const field = endpoint === "start" ? { startBinding: binding } : { endBinding: binding };
  mutateElement(arrow, field);

  // Add arrow to shape's boundElements if not already present
  const existing = target.boundElements ?? [];
  const alreadyBound = existing.some((be) => be.id === arrow.id);
  if (!alreadyBound) {
    mutateElement(target, {
      boundElements: [...existing, { id: arrow.id, type: "arrow" as const }],
    });
  }
}

/**
 * Unbind one endpoint of an arrow.
 * Clears arrow binding and removes arrow from the shape's boundElements.
 */
export function unbindArrowEndpoint(
  arrow: ExcalidrawArrowElement,
  endpoint: BindingEndpoint,
  elements: readonly ExcalidrawElement[],
): void {
  const binding = endpoint === "start" ? arrow.startBinding : arrow.endBinding;
  if (!binding) return;

  // Clear the arrow's binding
  const clearField = endpoint === "start" ? { startBinding: null } : { endBinding: null };
  mutateElement(arrow, clearField);

  // Remove arrow from shape's boundElements
  const shape = elements.find((el) => el.id === binding.elementId);
  if (!shape) return;

  mutateElement(shape, {
    boundElements: (shape.boundElements ?? []).filter((be) => be.id !== arrow.id),
  });
}

/**
 * Unbind all arrows from a shape.
 * For each arrow in boundElements, clear its binding reference to this shape.
 */
export function unbindAllArrowsFromShape(
  shape: ExcalidrawElement,
  elements: readonly ExcalidrawElement[],
): void {
  const bound = shape.boundElements ?? [];
  if (bound.length === 0) return;

  for (const entry of bound) {
    const arrow = elements.find((el) => el.id === entry.id);
    if (!arrow || !isArrowElement(arrow)) continue;

    if (arrow.startBinding?.elementId === shape.id) {
      mutateElement(arrow, { startBinding: null });
    }
    if (arrow.endBinding?.elementId === shape.id) {
      mutateElement(arrow, { endBinding: null });
    }
  }

  mutateElement(shape, { boundElements: [] });
}

/**
 * Unbind both endpoints of an arrow.
 */
export function unbindArrow(
  arrow: ExcalidrawArrowElement,
  elements: readonly ExcalidrawElement[],
): void {
  unbindArrowEndpoint(arrow, "start", elements);
  unbindArrowEndpoint(arrow, "end", elements);
}

/**
 * Find a bindable element by ID in the elements array.
 */
export function findBindableElement(
  elementId: string,
  elements: readonly ExcalidrawElement[],
): BindableElement | null {
  const el = elements.find((e) => e.id === elementId);
  if (!el || el.isDeleted || !isBindableElement(el)) return null;
  return el;
}
