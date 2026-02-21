import type { ExcalidrawElement } from "../elements/types";
import type { ExportDimensions } from "./types";
import { getCommonBounds } from "../selection/bounds";

export function getExportSize(
  elements: readonly ExcalidrawElement[],
  padding: number,
  scale: number,
): ExportDimensions | null {
  const bounds = getCommonBounds(elements);
  if (!bounds) return null;

  const [minX, minY, maxX, maxY] = bounds;
  return {
    width: Math.ceil((maxX - minX + padding * 2) * scale),
    height: Math.ceil((maxY - minY + padding * 2) * scale),
  };
}
