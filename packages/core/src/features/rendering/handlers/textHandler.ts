import type { ExcalidrawElement, ExcalidrawTextElement, FileId } from "../../elements/types";
import type { ImageCacheEntry } from "../../image/types";
import type { Theme } from "../../theme/types";
import type { ShapeHandler } from "../../../shared/shapeHandlerRegistry";
import type { GlobalPoint } from "../../../shared/math";
import type { Bounds } from "../../selection/bounds";
import type { RoughCanvas } from "roughjs/bin/canvas";
import { getElementBounds } from "../../selection/bounds";
import { applyElementTransform } from "../renderElement";
import { getFontString, getLineHeightInPx } from "../textMeasurement";
import { resolveColor } from "../../theme/colors";
import { hitTestRectangular } from "./hitTestRect";

export const textHandler: ShapeHandler = {
  type: "text",

  render(
    ctx: CanvasRenderingContext2D,
    _rc: RoughCanvas,
    element: ExcalidrawElement,
    theme: Theme,
    _imageCache?: ReadonlyMap<FileId, ImageCacheEntry>,
    _zoom?: number,
  ): void {
    const textEl = element as ExcalidrawTextElement;
    if (!textEl.text) return;

    ctx.save();
    applyElementTransform(ctx, textEl);

    ctx.font = getFontString(textEl.fontSize, textEl.fontFamily);
    ctx.fillStyle = resolveColor(textEl.strokeColor, theme);
    ctx.textAlign = textEl.textAlign as CanvasTextAlign;
    ctx.textBaseline = "top";

    const lineHeightPx = getLineHeightInPx(textEl.fontSize, textEl.lineHeight);
    const lines = textEl.text.split("\n");

    let horizontalOffset = 0;
    switch (textEl.textAlign) {
      case "center": {
        horizontalOffset = textEl.width / 2;
        break;
      }
      case "right": {
        horizontalOffset = textEl.width;
        break;
      }
    }

    for (const [i, line] of lines.entries()) {
      ctx.fillText(line, horizontalOffset, i * lineHeightPx);
    }

    ctx.restore();
  },

  hitTest(point: GlobalPoint, element: ExcalidrawElement, threshold: number): boolean {
    return hitTestRectangular(point, element, threshold);
  },

  getBounds(element: ExcalidrawElement): Bounds {
    return getElementBounds(element);
  },
};
