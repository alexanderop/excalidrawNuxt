import type { ExcalidrawElement, ExcalidrawTextElement, ElementsMap } from "../elements/types";
import { mutateElement } from "../elements/mutateElement";
import { getBoundTextElement, BOUND_TEXT_PADDING } from "../elements";
import { getFontString, measureText } from "../rendering/textMeasurement";

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
