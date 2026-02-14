import type { RoughCanvas } from "roughjs/bin/canvas";
import type { ExcalidrawElement } from "../elements/types";
import type { Theme } from "../theme/types";
import type { FileId } from "../elements/types";
import type { ImageCacheEntry } from "../image";
import { getElementBounds } from "../selection/bounds";
import { renderElement } from "./renderElement";

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

  for (const element of elements) {
    const [x1, y1, x2, y2] = getElementBounds(element);
    if (x2 < viewMinX || x1 > viewMaxX || y2 < viewMinY || y1 > viewMaxY) continue;
    renderElement(ctx, rc, element, theme, imageCache, zoom);
  }

  ctx.restore();
}
