import type { ExcalidrawElement, FileId } from "../elements/types";
import type { ImageCacheEntry } from "../image/types";
import type { Theme } from "../theme/types";

export type CanvasExportMimeType = "image/png" | "image/jpeg" | "image/webp";

export const DEFAULT_EXPORT_PADDING = 20;

export interface ExportOptions {
  elements: readonly ExcalidrawElement[];
  theme: Theme;
  background: boolean;
  padding: number;
  scale: number;
  imageCache?: ReadonlyMap<FileId, ImageCacheEntry>;
}

export interface ExportDimensions {
  width: number;
  height: number;
}
