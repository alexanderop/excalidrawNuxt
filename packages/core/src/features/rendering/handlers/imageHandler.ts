import type { ExcalidrawImageElement } from "../../elements/types";
import type { ShapeHandler } from "../../../shared/shapeHandlerRegistry";
import type { GlobalPoint } from "../../../shared/math";
import type { Bounds } from "../../selection/bounds";
import { getElementBounds } from "../../selection/bounds";
import { renderImageElement } from "../../image/renderImageElement";
import { hitTestRectangular } from "./hitTestRect";

export const imageHandler: ShapeHandler<ExcalidrawImageElement> = {
  type: "image",

  render(ctx, _rc, element, _theme, imageCache?, _zoom?) {
    renderImageElement(ctx, element, imageCache ?? new Map());
  },

  hitTest(point: GlobalPoint, element: ExcalidrawImageElement, threshold: number): boolean {
    return hitTestRectangular(point, element, threshold);
  },

  getBounds(element: ExcalidrawImageElement): Bounds {
    return getElementBounds(element);
  },
};
