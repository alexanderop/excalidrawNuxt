import type { ExcalidrawFreeDrawElement, FileId } from "../../elements/types";
import type { ImageCacheEntry } from "../../image/types";
import type { Theme } from "../../theme/types";
import type { ShapeHandler } from "../../../shared/shapeHandlerRegistry";
import type { GlobalPoint } from "../../../shared/math";
import type { Bounds } from "../../selection/bounds";
import type { RoughCanvas } from "roughjs/bin/canvas";
import { getElementBounds } from "../../selection/bounds";
import { renderFreeDrawElement } from "../renderFreeDraw";
import { hitTestPolyline } from "./hitTestLinear";

export const freeDrawHandler: ShapeHandler<ExcalidrawFreeDrawElement> = {
  type: "freedraw",

  render(
    ctx: CanvasRenderingContext2D,
    _rc: RoughCanvas,
    element: ExcalidrawFreeDrawElement,
    theme: Theme,
    _imageCache?: ReadonlyMap<FileId, ImageCacheEntry>,
    _zoom?: number,
  ): void {
    renderFreeDrawElement(ctx, element, theme);
  },

  hitTest(point: GlobalPoint, element: ExcalidrawFreeDrawElement, threshold: number): boolean {
    return hitTestPolyline(point, element, threshold);
  },

  getBounds(element: ExcalidrawFreeDrawElement): Bounds {
    return getElementBounds(element);
  },
};
