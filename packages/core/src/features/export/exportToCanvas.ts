import rough from "roughjs";
import { getCommonBounds } from "../selection/bounds";
import { resolveColor } from "../theme/colors";
import { renderElement } from "../rendering/renderElement";
import type { ExportOptions } from "./types";
import {
  CANVAS_BG,
  collectArrowIds,
  isArrowBoundText,
  renderArrowTextBackground,
} from "../rendering/renderUtils";

export function exportToCanvas(options: ExportOptions): HTMLCanvasElement {
  const { theme, background, padding, scale, imageCache } = options;
  const elements = options.elements;

  const canvas = document.createElement("canvas");
  const bounds = getCommonBounds(elements);

  if (!bounds) {
    canvas.width = 1;
    canvas.height = 1;
    return canvas;
  }

  const [minX, minY, maxX, maxY] = bounds;
  const canvasWidth = maxX - minX + padding * 2;
  const canvasHeight = maxY - minY + padding * 2;

  canvas.width = Math.ceil(canvasWidth * scale);
  canvas.height = Math.ceil(canvasHeight * scale);

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get 2d context from canvas");

  ctx.scale(scale, scale);
  ctx.translate(-minX + padding, -minY + padding);

  if (background) {
    ctx.save();
    ctx.fillStyle = resolveColor(CANVAS_BG, theme);
    ctx.fillRect(minX - padding, minY - padding, canvasWidth, canvasHeight);
    ctx.restore();
  }

  const rc = rough.canvas(canvas);
  const arrowIds = collectArrowIds(elements);

  for (const element of elements) {
    if (isArrowBoundText(element, arrowIds)) {
      renderArrowTextBackground(ctx, element, theme);
    }
    renderElement(ctx, rc, element, theme, imageCache, 1);
  }

  return canvas;
}
