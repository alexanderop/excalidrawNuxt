import type { ExcalidrawElement, ExcalidrawImageElement, FileId } from "../../elements/types";
import type { ImageCacheEntry } from "../../image/types";
import type { Theme } from "../../theme/types";
import type { ShapeHandler } from "../../../shared/shapeHandlerRegistry";
import type { GlobalPoint } from "../../../shared/math";
import type { Bounds } from "../../selection/bounds";
import type { RoughCanvas } from "roughjs/bin/canvas";
import { getElementBounds } from "../../selection/bounds";
import { renderImageElement } from "../../image/renderImageElement";
import { hitTestRectangular } from "./hitTestRect";

export const imageHandler: ShapeHandler = {
  type: "image",

  render(
    ctx: CanvasRenderingContext2D,
    _rc: RoughCanvas,
    element: ExcalidrawElement,
    _theme: Theme,
    imageCache?: ReadonlyMap<FileId, ImageCacheEntry>,
    _zoom?: number,
  ): void {
    renderImageElement(ctx, element as ExcalidrawImageElement, imageCache ?? new Map());
  },

  hitTest(point: GlobalPoint, element: ExcalidrawElement, threshold: number): boolean {
    return hitTestRectangular(point, element, threshold);
  },

  getBounds(element: ExcalidrawElement): Bounds {
    return getElementBounds(element);
  },
};
