import type { RoughCanvas } from "roughjs/bin/canvas";
import type { ExcalidrawElement, FileId } from "../../elements/types";
import type { ImageCacheEntry } from "../../image/types";
import type { Theme } from "../../theme/types";
import type { BindableShapeHandler } from "../../../shared/shapeHandlerRegistry";
import type { GlobalPoint, Radians } from "../../../shared/math";
import type { Bounds } from "../../selection/bounds";
import {
  pointFrom,
  pointRotateRads,
  ellipse,
  ellipseDistanceFromPoint,
} from "../../../shared/math";
import { getElementBounds } from "../../selection/bounds";
import { applyElementTransform } from "../renderElement";
import { generateShape } from "../shapeGenerator";

export const ellipseHandler: BindableShapeHandler = {
  type: "ellipse",

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
    const cx = element.x + element.width / 2;
    const cy = element.y + element.height / 2;
    const rotated = pointRotateRads(
      point,
      pointFrom<GlobalPoint>(cx, cy),
      -element.angle as Radians,
    );

    const rx = element.width / 2;
    const ry = element.height / 2;
    const dx = rotated[0] - cx;
    const dy = rotated[1] - cy;

    const outerRx = rx + threshold;
    const outerRy = ry + threshold;
    return (dx * dx) / (outerRx * outerRx) + (dy * dy) / (outerRy * outerRy) <= 1;
  },

  getBounds(element: ExcalidrawElement): Bounds {
    return getElementBounds(element);
  },

  distanceToEdge(element: ExcalidrawElement, point: GlobalPoint): number {
    const cx = element.x + element.width / 2;
    const cy = element.y + element.height / 2;
    const rx = element.width / 2;
    const ry = element.height / 2;

    if (rx === 0 || ry === 0) return Math.hypot(point[0] - cx, point[1] - cy);

    const e = ellipse(pointFrom<GlobalPoint>(cx, cy), rx, ry);
    return ellipseDistanceFromPoint(point, e);
  },

  isPointInside(element: ExcalidrawElement, point: GlobalPoint): boolean {
    const cx = element.x + element.width / 2;
    const cy = element.y + element.height / 2;
    const rx = element.width / 2;
    const ry = element.height / 2;
    if (rx === 0 || ry === 0) return false;
    const dx = (point[0] - cx) / rx;
    const dy = (point[1] - cy) / ry;
    return dx * dx + dy * dy <= 1;
  },

  projectOntoEdge(
    element: ExcalidrawElement,
    cx: number,
    cy: number,
    dirX: number,
    dirY: number,
  ): GlobalPoint {
    const rx = element.width / 2;
    const ry = element.height / 2;
    if (rx === 0 || ry === 0) return pointFrom<GlobalPoint>(cx, cy);

    // Handle zero direction vector
    if (dirX === 0 && dirY === 0) return pointFrom<GlobalPoint>(cx, cy);

    // Ray-ellipse intersection: find t such that (cx + dirX*t, cy + dirY*t) is on ellipse
    const t = 1 / Math.sqrt((dirX * dirX) / (rx * rx) + (dirY * dirY) / (ry * ry));
    return pointFrom<GlobalPoint>(cx + dirX * t, cy + dirY * t);
  },

  drawHighlight(ctx: CanvasRenderingContext2D, element: ExcalidrawElement, padding: number): void {
    const rx = element.width / 2 + padding;
    const ry = element.height / 2 + padding;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
  },
};
