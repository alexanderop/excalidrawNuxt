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
  lineSegment,
  distanceToLineSegment,
  polygonFromPoints,
  polygonIncludesPoint,
  pointOnPolygon,
} from "../../../shared/math";
import { getElementBounds } from "../../selection/bounds";
import { applyElementTransform } from "../renderElement";
import { generateShape } from "../shapeGenerator";

/**
 * Intersect ray (origin=0, dir) with segment (a, b).
 * Returns parameter t along ray, or null if no intersection.
 */
function raySegmentIntersection(
  dirX: number,
  dirY: number,
  a: GlobalPoint,
  b: GlobalPoint,
): number | null {
  const edgeX = b[0] - a[0];
  const edgeY = b[1] - a[1];
  const denom = dirX * edgeY - dirY * edgeX;

  if (Math.abs(denom) < 1e-10) return null;

  const t = (a[0] * edgeY - a[1] * edgeX) / denom;
  const u = (a[0] * dirY - a[1] * dirX) / denom;

  if (u >= 0 && u <= 1 && t > 0) return t;
  return null;
}

export const diamondHandler: BindableShapeHandler = {
  type: "diamond",

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

    const vertices: GlobalPoint[] = [
      pointFrom<GlobalPoint>(cx, element.y),
      pointFrom<GlobalPoint>(element.x + element.width, cy),
      pointFrom<GlobalPoint>(cx, element.y + element.height),
      pointFrom<GlobalPoint>(element.x, cy),
    ];

    const poly = polygonFromPoints<GlobalPoint>(vertices);
    if (polygonIncludesPoint(rotated, poly)) return true;
    return pointOnPolygon(rotated, poly, threshold);
  },

  getBounds(element: ExcalidrawElement): Bounds {
    return getElementBounds(element);
  },

  distanceToEdge(element: ExcalidrawElement, point: GlobalPoint): number {
    const cx = element.x + element.width / 2;
    const cy = element.y + element.height / 2;
    const vertices: GlobalPoint[] = [
      pointFrom<GlobalPoint>(cx, element.y),
      pointFrom<GlobalPoint>(element.x + element.width, cy),
      pointFrom<GlobalPoint>(cx, element.y + element.height),
      pointFrom<GlobalPoint>(element.x, cy),
    ];
    let minDist = Infinity;
    for (let i = 0; i < 4; i++) {
      const a = vertices[i];
      const b = vertices[(i + 1) % 4];
      if (!a || !b) continue;
      const d = distanceToLineSegment(point, lineSegment(a, b));
      if (d < minDist) minDist = d;
    }
    return minDist;
  },

  isPointInside(element: ExcalidrawElement, point: GlobalPoint): boolean {
    const cx = element.x + element.width / 2;
    const cy = element.y + element.height / 2;
    const hw = element.width / 2;
    const hh = element.height / 2;
    if (hw === 0 || hh === 0) return false;
    const dx = Math.abs(point[0] - cx) / hw;
    const dy = Math.abs(point[1] - cy) / hh;
    return dx + dy <= 1;
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

    // Diamond vertices relative to center: top(0,-hh), right(hw,0), bottom(0,hh), left(-hw,0)
    const vertices: GlobalPoint[] = [
      pointFrom<GlobalPoint>(0, -hh),
      pointFrom<GlobalPoint>(hw, 0),
      pointFrom<GlobalPoint>(0, hh),
      pointFrom<GlobalPoint>(-hw, 0),
    ];

    let closestT = Infinity;
    for (let i = 0; i < 4; i++) {
      const a = vertices[i];
      const b = vertices[(i + 1) % 4];
      if (!a || !b) continue;
      const t = raySegmentIntersection(dirX, dirY, a, b);
      if (t !== null && t > 0 && t < closestT) {
        closestT = t;
      }
    }

    if (!Number.isFinite(closestT)) return pointFrom<GlobalPoint>(cx, cy);

    return pointFrom<GlobalPoint>(cx + dirX * closestT, cy + dirY * closestT);
  },

  drawHighlight(ctx: CanvasRenderingContext2D, element: ExcalidrawElement, padding: number): void {
    const hw = element.width / 2 + padding;
    const hh = element.height / 2 + padding;
    ctx.beginPath();
    ctx.moveTo(0, -hh);
    ctx.lineTo(hw, 0);
    ctx.lineTo(0, hh);
    ctx.lineTo(-hw, 0);
    ctx.closePath();
    ctx.stroke();
  },
};
