import type { RoughCanvas } from "roughjs/bin/canvas";
import type { ExcalidrawElement } from "../elements/types";
import { isTextElement, isArrowElement } from "../elements/types";
import type { Theme } from "../theme/types";
import type { FileId } from "../elements/types";
import type { ImageCacheEntry } from "../image";
import { getElementBounds } from "../selection/bounds";
import { resolveColor } from "../theme/colors";
import { BOUND_TEXT_PADDING } from "../elements";
import { renderElement } from "./renderElement";

const CANVAS_BG = "#ffffff";

function collectArrowIds(elements: readonly ExcalidrawElement[]): Set<string> {
  const arrowIds = new Set<string>();
  for (const el of elements) {
    if (isArrowElement(el)) arrowIds.add(el.id);
  }
  return arrowIds;
}

function isOutsideViewport(
  element: ExcalidrawElement,
  viewMinX: number,
  viewMinY: number,
  viewMaxX: number,
  viewMaxY: number,
): boolean {
  const [x1, y1, x2, y2] = getElementBounds(element);
  return x2 < viewMinX || x1 > viewMaxX || y2 < viewMinY || y1 > viewMaxY;
}

function isArrowBoundText(element: ExcalidrawElement, arrowIds: Set<string>): boolean {
  return (
    isTextElement(element) &&
    !!element.containerId &&
    arrowIds.has(element.containerId) &&
    !!element.text
  );
}

function renderArrowTextBackground(
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

export function renderScene(
  ctx: CanvasRenderingContext2D,
  rc: RoughCanvas,
  elements: readonly ExcalidrawElement[],
  scrollX: number,
  scrollY: number,
  zoom: number,
  w: number,
  h: number,
  theme: Theme,
  imageCache?: ReadonlyMap<FileId, ImageCacheEntry>,
): void {
  ctx.save();
  ctx.scale(zoom, zoom);
  ctx.translate(scrollX, scrollY);

  const viewMinX = -scrollX;
  const viewMinY = -scrollY;
  const viewMaxX = viewMinX + w / zoom;
  const viewMaxY = viewMinY + h / zoom;

  const arrowIds = collectArrowIds(elements);

  for (const element of elements) {
    if (isOutsideViewport(element, viewMinX, viewMinY, viewMaxX, viewMaxY)) continue;

    if (isArrowBoundText(element, arrowIds)) {
      renderArrowTextBackground(ctx, element, theme);
    }

    renderElement(ctx, rc, element, theme, imageCache, zoom);
  }

  ctx.restore();
}
