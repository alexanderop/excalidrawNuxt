/**
 * Renders L-shaped crop handles at the 4 corners of an image element.
 */

import type { ExcalidrawImageElement } from "./types";
import type { Theme } from "../theme/types";
import { SELECTION_COLORS } from "../selection/constants";

const HANDLE_ARM_LENGTH = 20;
const HANDLE_STROKE_WIDTH = 3;

/**
 * Draw L-shaped crop handles at the element's four corners.
 * Rendered in element-local rotated space.
 */
export function renderCropHandles(
  ctx: CanvasRenderingContext2D,
  element: ExcalidrawImageElement,
  zoom: number,
  theme: Theme,
): void {
  const armLen = HANDLE_ARM_LENGTH / zoom;
  const strokeWidth = HANDLE_STROKE_WIDTH / zoom;

  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;
  const hw = element.width / 2;
  const hh = element.height / 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(element.angle);

  ctx.strokeStyle = SELECTION_COLORS[theme].selection;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = "round";
  ctx.setLineDash([]);

  // NW corner
  drawLHandle(ctx, -hw, -hh, armLen, armLen);
  // NE corner
  drawLHandle(ctx, hw, -hh, -armLen, armLen);
  // SW corner
  drawLHandle(ctx, -hw, hh, armLen, -armLen);
  // SE corner
  drawLHandle(ctx, hw, hh, -armLen, -armLen);

  ctx.restore();
}

function drawLHandle(
  ctx: CanvasRenderingContext2D,
  cornerX: number,
  cornerY: number,
  armDx: number,
  armDy: number,
): void {
  ctx.beginPath();
  // Horizontal arm
  ctx.moveTo(cornerX + armDx, cornerY);
  ctx.lineTo(cornerX, cornerY);
  // Vertical arm
  ctx.lineTo(cornerX, cornerY + armDy);
  ctx.stroke();
}
