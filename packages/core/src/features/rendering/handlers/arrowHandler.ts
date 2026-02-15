import type { ShapeHandler } from "../../../shared/shapeHandlerRegistry";
import type { Bounds } from "../../selection/bounds";
import type { ExcalidrawArrowElement } from "../../elements/types";
import type { GlobalPoint } from "../../../shared/math";
import { generateShape } from "../shapeGenerator";
import { applyElementTransform } from "../renderElement";
import { renderArrowheads } from "../arrowhead";
import { getElementBounds } from "../../selection/bounds";
import { hitTestPolyline } from "./hitTestLinear";

export const arrowHandler: ShapeHandler<ExcalidrawArrowElement> = {
  type: "arrow",

  render(ctx, rc, element, theme, _imageCache?, zoom?) {
    if (element.points.length < 2) return;

    ctx.save();
    applyElementTransform(ctx, element);

    const drawable = generateShape(element, theme, zoom);
    rc.draw(drawable);

    renderArrowheads(ctx, element, theme);

    ctx.restore();
  },

  hitTest(point: GlobalPoint, element: ExcalidrawArrowElement, threshold: number): boolean {
    return hitTestPolyline(point, element, threshold);
  },

  getBounds(element: ExcalidrawArrowElement): Bounds {
    return getElementBounds(element);
  },
};
