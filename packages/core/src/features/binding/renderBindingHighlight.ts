import type { ExcalidrawElement } from "../elements/types";
import { isArrowElement, isTextElement } from "../elements/types";
import type { Theme } from "../theme/types";
import {
  BINDING_COLORS,
  BINDING_HIGHLIGHT_LINE_WIDTH,
  BINDING_HIGHLIGHT_PADDING,
} from "./constants";
import { shapeRegistry } from "../../shared/shapeRegistry";
import { isBindableHandler } from "../../shared/shapeHandlerRegistry";

/**
 * Draw a highlight outline around a bindable shape to indicate
 * that an arrow endpoint can bind to it.
 */
export function renderSuggestedBinding(
  ctx: CanvasRenderingContext2D,
  element: ExcalidrawElement,
  zoom: number,
  theme: Theme,
): void {
  if (isArrowElement(element)) return;
  if (isTextElement(element)) return;

  const padding = BINDING_HIGHLIGHT_PADDING / zoom;
  const lineWidth = BINDING_HIGHLIGHT_LINE_WIDTH / zoom;

  ctx.save();
  ctx.strokeStyle = BINDING_COLORS[theme].highlight;
  ctx.lineWidth = lineWidth;
  ctx.setLineDash([]);

  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;

  ctx.translate(cx, cy);
  ctx.rotate(element.angle);

  const handler = shapeRegistry.getHandler(element);
  if (!isBindableHandler(handler)) {
    throw new Error(`No bindable handler for type: ${element.type}`);
  }
  handler.drawHighlight(ctx, element, padding);

  ctx.restore();
}
