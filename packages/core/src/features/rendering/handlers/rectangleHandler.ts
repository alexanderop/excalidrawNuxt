import type { RoughCanvas } from "roughjs/bin/canvas";
import type { ExcalidrawElement, FileId } from "../../elements/types";
import type { ImageCacheEntry } from "../../image/types";
import type { Theme } from "../../theme/types";
import type { BindableShapeHandler } from "../../../shared/shapeHandlerRegistry";
import type { GlobalPoint } from "../../../shared/math";
import type { Bounds } from "../../selection/bounds";
import { pointFrom, lineSegment, distanceToLineSegment } from "../../../shared/math";
import { getElementBounds } from "../../selection/bounds";
import { applyElementTransform } from "../renderElement";
import { generateShape } from "../shapeGenerator";
import { hitTestRectangular } from "./hitTestRect";

export const rectangleHandler: BindableShapeHandler = {
  type: "rectangle",

  render(
    ctx: CanvasRenderingContext2D,
    rc: RoughCanvas,
    element: ExcalidrawElement,
    theme: Theme,
    _imageCache?: ReadonlyMap<FileId, ImageCacheEntry>,
    zoom?: number,
  ): void {
    ctx.save();
    applyElementTransform(ctx, element);
    const drawable = generateShape(element, theme, zoom);
    rc.draw(drawable);
    ctx.restore();
  },

  hitTest(point: GlobalPoint, element: ExcalidrawElement, threshold: number): boolean {
    return hitTestRectangular(point, element, threshold);
  },

  getBounds(element: ExcalidrawElement): Bounds {
    return getElementBounds(element);
  },

  distanceToEdge(element: ExcalidrawElement, point: GlobalPoint): number {
    const { x, y, width, height } = element;
    const edges: [GlobalPoint, GlobalPoint][] = [
      [pointFrom<GlobalPoint>(x, y), pointFrom<GlobalPoint>(x + width, y)],
      [pointFrom<GlobalPoint>(x + width, y), pointFrom<GlobalPoint>(x + width, y + height)],
      [pointFrom<GlobalPoint>(x + width, y + height), pointFrom<GlobalPoint>(x, y + height)],
      [pointFrom<GlobalPoint>(x, y + height), pointFrom<GlobalPoint>(x, y)],
    ];
    let minDist = Infinity;
    for (const [a, b] of edges) {
      const d = distanceToLineSegment(point, lineSegment(a, b));
      if (d < minDist) minDist = d;
    }
    return minDist;
  },

  isPointInside(element: ExcalidrawElement, point: GlobalPoint): boolean {
    return (
      point[0] >= element.x &&
      point[0] <= element.x + element.width &&
      point[1] >= element.y &&
      point[1] <= element.y + element.height
    );
  },

  projectOntoEdge(
    element: ExcalidrawElement,
    cx: number,
    cy: number,
    dirX: number,
    dirY: number,
  ): GlobalPoint {
    const hw = element.width / 2;
    const hh = element.height / 2;

    // Find the intersection of ray from center with rect edges
    let t = Infinity;
    if (dirX !== 0) {
      const tx = (dirX > 0 ? hw : -hw) / dirX;
      if (tx > 0) t = Math.min(t, tx);
    }
    if (dirY !== 0) {
      const ty = (dirY > 0 ? hh : -hh) / dirY;
      if (ty > 0) t = Math.min(t, ty);
    }

    if (!Number.isFinite(t)) return pointFrom<GlobalPoint>(cx, cy);

    return pointFrom<GlobalPoint>(cx + dirX * t, cy + dirY * t);
  },

  drawHighlight(ctx: CanvasRenderingContext2D, element: ExcalidrawElement, padding: number): void {
    ctx.strokeRect(
      -element.width / 2 - padding,
      -element.height / 2 - padding,
      element.width + padding * 2,
      element.height + padding * 2,
    );
  },
};
