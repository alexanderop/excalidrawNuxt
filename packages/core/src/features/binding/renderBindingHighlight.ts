import type { ExcalidrawElement } from "../elements/types";
import { isArrowElement, isTextElement } from "../elements/types";
import type { Theme } from "../theme/types";
import {
  BINDING_COLORS,
  BINDING_HIGHLIGHT_LINE_WIDTH,
  BINDING_HIGHLIGHT_PADDING,
} from "./constants";

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

  drawBindingShape(ctx, element, padding);

  ctx.restore();
}

function drawBindingShape(
  ctx: CanvasRenderingContext2D,
  element: ExcalidrawElement,
  padding: number,
): void {
  if (element.type === "rectangle") {
    ctx.strokeRect(
      -element.width / 2 - padding,
      -element.height / 2 - padding,
      element.width + padding * 2,
      element.height + padding * 2,
    );
    return;
  }

  if (element.type === "ellipse") {
    const rx = element.width / 2 + padding;
    const ry = element.height / 2 + padding;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }

  if (element.type === "diamond") {
    const hw = element.width / 2 + padding;
    const hh = element.height / 2 + padding;
    ctx.beginPath();
    ctx.moveTo(0, -hh);
    ctx.lineTo(hw, 0);
    ctx.lineTo(0, hh);
    ctx.lineTo(-hw, 0);
    ctx.closePath();
    ctx.stroke();
    return;
  }

  throw new Error(`Unhandled element type: ${(element as { type: string }).type}`);
}
