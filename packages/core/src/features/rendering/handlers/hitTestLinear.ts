import type { ExcalidrawLinearElement } from "../../elements/types";
import type { GlobalPoint, LocalPoint } from "../../../shared/math";
import { pointFrom, distanceToLineSegment, lineSegment } from "../../../shared/math";
import { curveCatmullRomToBezier, distanceToBezierCurves } from "../../../shared/curve";

/**
 * Shared hit test for polyline/curve elements (arrow, line, freeDraw).
 * For curved elements uses Bezier distance; for straight segments
 * uses distance-to-line-segment.
 */
export function hitTestPolyline(
  point: GlobalPoint,
  el: ExcalidrawLinearElement,
  threshold: number,
): boolean {
  if (el.roundness !== null) {
    const localPoint = pointFrom<LocalPoint>(point[0] - el.x, point[1] - el.y);
    const localPts = el.points.map((p) => pointFrom<LocalPoint>(p[0], p[1]));
    const curves = curveCatmullRomToBezier(localPts);
    return distanceToBezierCurves(curves, localPoint) <= threshold;
  }

  const pts = el.points.map((p) => pointFrom<GlobalPoint>(p[0] + el.x, p[1] + el.y));
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (!a || !b) continue;
    if (distanceToLineSegment(point, lineSegment(a, b)) <= threshold) return true;
  }
  return false;
}
