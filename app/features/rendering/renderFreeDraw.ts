import { generateFreeDrawShape } from "@excalidraw/element";
import type { ExcalidrawFreeDrawElement } from "~/features/elements/types";
import type { Theme } from "~/features/theme/types";
import { resolveColor } from "~/features/theme/colors";
import { applyElementTransform } from "./renderElement";

export function renderFreeDrawElement(
  ctx: CanvasRenderingContext2D,
  element: ExcalidrawFreeDrawElement,
  theme: Theme,
): void {
  if (element.points.length < 2) return;

  // Always regenerate — mutateElement mutates in place so the WeakMap
  // cache inside @excalidraw/element would return a stale Path2D.
  const path = generateFreeDrawShape(element);

  ctx.save();
  applyElementTransform(ctx, element);

  ctx.fillStyle = resolveColor(element.strokeColor, theme);
  ctx.fill(path);

  ctx.restore();
}
