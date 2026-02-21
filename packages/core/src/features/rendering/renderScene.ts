import type { RoughCanvas } from "roughjs/bin/canvas";
import type { ExcalidrawElement } from "../elements/types";
import type { Theme } from "../theme/types";
import type { FileId } from "../elements/types";
import type { ImageCacheEntry } from "../image";
import { getElementBounds } from "../selection/bounds";
import { renderElement } from "./renderElement";
import { collectArrowIds, isArrowBoundText, renderArrowTextBackground } from "./renderUtils";

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
