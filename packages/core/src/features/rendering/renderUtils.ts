import type { ExcalidrawElement } from "../elements/types";
import { isTextElement, isArrowElement } from "../elements/types";
import { BOUND_TEXT_PADDING } from "../elements";
import { resolveColor } from "../theme/colors";
import type { Theme } from "../theme/types";

export const CANVAS_BG = "#ffffff";

export function collectArrowIds(elements: readonly ExcalidrawElement[]): Set<string> {
  const arrowIds = new Set<string>();
  for (const el of elements) {
    if (isArrowElement(el)) arrowIds.add(el.id);
  }
  return arrowIds;
}

export function isArrowBoundText(element: ExcalidrawElement, arrowIds: Set<string>): boolean {
  return (
    isTextElement(element) &&
    !!element.containerId &&
    arrowIds.has(element.containerId) &&
    !!element.text
  );
}

export function renderArrowTextBackground(
  ctx: CanvasRenderingContext2D,
  element: ExcalidrawElement,
  theme: Theme,
): void {
  ctx.save();
  ctx.fillStyle = resolveColor(CANVAS_BG, theme);
  ctx.fillRect(
    element.x - BOUND_TEXT_PADDING,
    element.y - BOUND_TEXT_PADDING,
    element.width + BOUND_TEXT_PADDING * 2,
    element.height + BOUND_TEXT_PADDING * 2,
  );
  ctx.restore();
}
