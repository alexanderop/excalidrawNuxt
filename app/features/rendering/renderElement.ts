import type { RoughCanvas } from "roughjs/bin/canvas";
import type { ExcalidrawElement, ExcalidrawTextElement } from "~/features/elements/types";
import {
  isArrowElement,
  isLinearElement,
  isTextElement,
  isFreeDrawElement,
} from "~/features/elements/types";
import type { Theme } from "~/features/theme/types";
import { resolveColor } from "~/features/theme/colors";
import { isCodeElement, renderCodeElement } from "~/features/code";
import { isImageElement, renderImageElement } from "~/features/image";
import type { FileId, ImageCacheEntry } from "~/features/image";
import { generateShape } from "./shapeGenerator";
import { renderArrowheads } from "./arrowhead";
import { getFontString, getLineHeightInPx } from "./textMeasurement";
import { renderFreeDrawElement } from "./renderFreeDraw";

function isZeroSizeShape(element: ExcalidrawElement): boolean {
  return (
    !isLinearElement(element) &&
    !isFreeDrawElement(element) &&
    element.width === 0 &&
    element.height === 0
  );
}

/**
 * Applies the standard element transform: translate to center, rotate,
 * translate back to top-left origin, and set global alpha from opacity.
 * Call `ctx.save()` before and `ctx.restore()` after.
 */
export function applyElementTransform(
  ctx: CanvasRenderingContext2D,
  element: ExcalidrawElement,
): void {
  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;
  ctx.translate(cx, cy);
  ctx.rotate(element.angle);
  ctx.translate(-element.width / 2, -element.height / 2);
  ctx.globalAlpha = element.opacity / 100;
}

function renderSpecialElement(
  ctx: CanvasRenderingContext2D,
  element: ExcalidrawElement,
  theme: Theme,
  imageCache?: ReadonlyMap<FileId, ImageCacheEntry>,
): boolean {
  if (isImageElement(element)) {
    renderImageElement(ctx, element, imageCache ?? new Map());
    return true;
  }
  if (isCodeElement(element)) {
    renderCodeElement(ctx, element, theme);
    return true;
  }
  if (isFreeDrawElement(element)) {
    renderFreeDrawElement(ctx, element, theme);
    return true;
  }
  if (isTextElement(element)) {
    if (element.text) renderTextElement(ctx, element, theme);
    return true;
  }
  return false;
}

export function renderElement(
  ctx: CanvasRenderingContext2D,
  rc: RoughCanvas,
  element: ExcalidrawElement,
  theme: Theme,
  imageCache?: ReadonlyMap<FileId, ImageCacheEntry>,
): void {
  if (element.isDeleted) return;
  if (renderSpecialElement(ctx, element, theme, imageCache)) return;
  if (isLinearElement(element) && element.points.length < 2) return;
  if (isZeroSizeShape(element)) return;

  renderRoughShape(ctx, rc, element, theme);
}

function renderRoughShape(
  ctx: CanvasRenderingContext2D,
  rc: RoughCanvas,
  element: ExcalidrawElement,
  theme: Theme,
): void {
  ctx.save();
  applyElementTransform(ctx, element);

  const drawable = generateShape(element, theme);
  rc.draw(drawable);

  if (isArrowElement(element)) {
    renderArrowheads(ctx, element, theme);
  }

  ctx.restore();
}

function renderTextElement(
  ctx: CanvasRenderingContext2D,
  element: ExcalidrawTextElement,
  theme: Theme,
): void {
  ctx.save();
  applyElementTransform(ctx, element);

  ctx.font = getFontString(element.fontSize, element.fontFamily);
  ctx.fillStyle = resolveColor(element.strokeColor, theme);
  ctx.textAlign = element.textAlign as CanvasTextAlign;
  ctx.textBaseline = "top";

  const lineHeightPx = getLineHeightInPx(element.fontSize, element.lineHeight);
  const lines = element.text.split("\n");

  let horizontalOffset = 0;
  switch (element.textAlign) {
    case "center": {
      horizontalOffset = element.width / 2;
      break;
    }
    case "right": {
      horizontalOffset = element.width;
      break;
    }
  }

  for (const [i, line] of lines.entries()) {
    ctx.fillText(line, horizontalOffset, i * lineHeightPx);
  }

  ctx.restore();
}
