import type { RoughCanvas } from "roughjs/bin/canvas";
import type { ExcalidrawElement, FileId } from "../elements/types";
import { isLinearElement, isFreeDrawElement } from "../elements/types";
import type { Theme } from "../theme/types";
import { isCodeElement, renderCodeElement } from "../code";
import type { ImageCacheEntry } from "../image";
import { shapeRegistry } from "../../shared/shapeRegistry";

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

export function renderElement(
  ctx: CanvasRenderingContext2D,
  rc: RoughCanvas,
  element: ExcalidrawElement,
  theme: Theme,
  imageCache?: ReadonlyMap<FileId, ImageCacheEntry>,
  zoom = 1,
): void {
  if (element.isDeleted) return;
  if (element.type === "embeddable") return; // iframe overlay handles rendering
  if (isCodeElement(element)) {
    renderCodeElement(ctx, element, theme);
    return;
  }
  if (isLinearElement(element) && element.points.length < 2) return;
  if (isZeroSizeShape(element)) return;

  const handler = shapeRegistry.getHandler(element);
  handler.render(ctx, rc, element, theme, imageCache, zoom);
}
