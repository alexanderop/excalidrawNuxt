import type { ExcalidrawElement } from "../elements/types";
import type {
  ExcalidrawImageElement,
  InitializedExcalidrawImageElement,
  FileId,
} from "@excalidraw/element/types";

export type {
  FileId,
  ExcalidrawImageElement,
  InitializedExcalidrawImageElement,
} from "@excalidraw/element/types";

export interface ImageCacheEntry {
  image: HTMLImageElement;
  mimeType: string;
}

export function isImageElement(el: ExcalidrawElement | null): el is ExcalidrawImageElement {
  return el !== null && el.type === "image";
}

export function isInitializedImageElement(
  el: ExcalidrawElement | null,
): el is InitializedExcalidrawImageElement {
  return isImageElement(el) && el.fileId !== null;
}

/**
 * Convert a plain string to a branded `FileId`.
 * The double assertion (`as unknown as FileId`) is required because `FileId` is a branded
 * type from Excalidraw — there's no structural overlap with `string`, so TypeScript
 * requires going through `unknown` first.
 */
export function toFileId(id: string): FileId {
  // eslint-disable-next-line no-restricted-syntax -- branded type from @excalidraw/element has no structural overlap with string
  return id as unknown as FileId;
}
