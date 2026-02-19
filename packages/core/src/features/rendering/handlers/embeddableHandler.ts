import type { ExcalidrawEmbeddableElement } from "../../elements/types";
import type { ShapeHandler } from "../../../shared/shapeHandlerRegistry";
import type { GlobalPoint } from "../../../shared/math";
import type { Bounds } from "../../selection/bounds";
import type { Theme } from "../../theme/types";
import { getElementBounds } from "../../selection/bounds";
import { renderEmbeddablePlaceholder } from "../../embeddable/renderEmbeddablePlaceholder";
import { hitTestRectangular } from "./hitTestRect";

export const embeddableHandler: ShapeHandler<ExcalidrawEmbeddableElement> = {
  type: "embeddable",

  render(ctx, _rc, element, theme: Theme) {
    renderEmbeddablePlaceholder(ctx, element, theme === "dark");
  },

  hitTest(point: GlobalPoint, element: ExcalidrawEmbeddableElement, threshold: number): boolean {
    return hitTestRectangular(point, element, threshold);
  },

  getBounds(element: ExcalidrawEmbeddableElement): Bounds {
    return getElementBounds(element);
  },
};
