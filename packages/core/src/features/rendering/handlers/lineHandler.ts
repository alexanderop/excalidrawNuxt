import type { ShapeHandler } from "../../../shared/shapeHandlerRegistry";
import type { Bounds } from "../../selection/bounds";
import type { ExcalidrawLineElement } from "../../elements/types";
import type { GlobalPoint } from "../../../shared/math";
import { generateShape } from "../shapeGenerator";
import { applyElementTransform } from "../renderElement";
import { getElementBounds } from "../../selection/bounds";
import { hitTestPolyline } from "./hitTestLinear";

export const lineHandler: ShapeHandler<ExcalidrawLineElement> = {
  type: "line",

  render(ctx, rc, element, theme, _imageCache?, zoom?) {
    if (element.points.length < 2) return;

    ctx.save();
    applyElementTransform(ctx, element);

    const drawable = generateShape(element, theme, zoom);
    rc.draw(drawable);

    ctx.restore();
  },

  hitTest(point: GlobalPoint, element: ExcalidrawLineElement, threshold: number): boolean {
    return hitTestPolyline(point, element, threshold);
  },

  getBounds(element: ExcalidrawLineElement): Bounds {
    return getElementBounds(element);
  },
};
