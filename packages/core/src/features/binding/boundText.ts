import type {
  ExcalidrawElement,
  ExcalidrawArrowElement,
  ExcalidrawTextElement,
  ElementsMap,
} from "../elements/types";
import { mutateElement } from "../elements/mutateElement";
import { createElement } from "../elements/createElement";
import { getBoundTextElement, BOUND_TEXT_PADDING } from "../elements";
import { getFontString, measureText } from "../rendering/textMeasurement";
import { getArrowMidpoint } from "./arrowMidpoint";

/**
 * Bind a text element to a container shape.
 * Sets containerId on the text and adds a text entry to the container's boundElements.
 */
export function bindTextToContainer(
  textElement: ExcalidrawTextElement,
  container: ExcalidrawElement,
): void {
  mutateElement(textElement, { containerId: container.id });

  const existing = container.boundElements ?? [];
  const alreadyBound = existing.some((be) => be.id === textElement.id);
  if (!alreadyBound) {
    mutateElement(container, {
      boundElements: [...existing, { id: textElement.id, type: "text" as const }],
    });
  }
}

/**
 * Unbind a text element from its container.
 * Clears containerId on text and removes the text entry from the container's boundElements.
 */
export function unbindTextFromContainer(
  textElement: ExcalidrawTextElement,
  container: ExcalidrawElement,
): void {
  mutateElement(textElement, { containerId: null });
  mutateElement(container, {
    boundElements: (container.boundElements ?? []).filter((be) => be.id !== textElement.id),
  });
}

/**
 * Delete the bound text element for a container (used when deleting the container).
 */
export function deleteBoundTextForContainer(
  container: ExcalidrawElement,
  elementMap: ElementsMap,
): void {
  const boundText = getBoundTextElement(container, elementMap);
  if (boundText) {
    mutateElement(boundText, { isDeleted: true });
  }
}

/**
 * Update bound text position and container dimensions after the container changes
 * (drag, resize, etc.).
 */
export function updateBoundTextAfterContainerChange(
  container: ExcalidrawElement,
  elementMap: ElementsMap,
): void {
  const boundText = getBoundTextElement(container, elementMap);
  if (!boundText) return;

  const font = getFontString(boundText.fontSize, boundText.fontFamily);
  const maxWidth = container.width - BOUND_TEXT_PADDING * 2;
  const { height } = measureText(boundText.originalText, font, boundText.lineHeight);

  // Grow container height if text overflows
  const minContainerHeight = height + BOUND_TEXT_PADDING * 2;
  if (container.height < minContainerHeight) {
    mutateElement(container, { height: minContainerHeight });
  }

  // Center text within container
  const x = container.x + (container.width - maxWidth) / 2;
  const y = container.y + (container.height - height) / 2;

  mutateElement(boundText, {
    text: boundText.originalText,
    width: maxWidth,
    height,
    x,
    y,
  });
}

/**
 * Update the position of a text label bound to an arrow.
 * Positions the text centered at the arrow's midpoint.
 */
export function updateBoundTextOnArrow(
  arrow: ExcalidrawArrowElement,
  elementMap: ElementsMap,
): void {
  const boundText = getBoundTextElement(arrow, elementMap);
  if (!boundText) return;

  const midpoint = getArrowMidpoint(arrow);

  mutateElement(boundText, {
    x: midpoint[0] - boundText.width / 2,
    y: midpoint[1] - boundText.height / 2,
  });
}

/**
 * Create and bind a text element to an arrow.
 * Returns the created text element positioned at the arrow's midpoint.
 */
export function createBoundTextForArrow(
  arrow: ExcalidrawArrowElement,
  text: string,
  fontSize: number,
  fontFamily: number,
): ExcalidrawTextElement {
  const midpoint = getArrowMidpoint(arrow);

  const textElement = createElement("text", midpoint[0], midpoint[1], {
    fontSize,
    fontFamily,
    text,
    originalText: text,
    containerId: arrow.id,
  });

  // Add text to the arrow's boundElements
  const existing = arrow.boundElements ?? [];
  mutateElement(arrow, {
    boundElements: [...existing, { id: textElement.id, type: "text" as const }],
  });

  return textElement;
}
