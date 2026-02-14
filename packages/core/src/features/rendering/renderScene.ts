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

  // Build a set of container IDs that are arrows, so we know which text
  // elements need a background rect to cut through the arrow line behind them.
  const arrowIds = new Set<string>();
  for (const el of elements) {
    if (isArrowElement(el)) arrowIds.add(el.id);
  }

  for (const element of elements) {
    const [x1, y1, x2, y2] = getElementBounds(element);
    if (x2 < viewMinX || x1 > viewMaxX || y2 < viewMinY || y1 > viewMaxY) continue;

    // Arrow-bound text: fill a background rect to cut the arrow line behind the label
    if (
      isTextElement(element) &&
      element.containerId &&
      arrowIds.has(element.containerId) &&
      element.text
    ) {
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

    renderElement(ctx, rc, element, theme, imageCache, zoom);
  }

  ctx.restore();
}
