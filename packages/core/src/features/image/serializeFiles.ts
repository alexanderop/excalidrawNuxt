import type { ExcalidrawElement } from "../elements/types";
import type {
  FileId,
  ImageCacheEntry,
  BinaryFileData,
  BinaryFiles,
  InitializedExcalidrawImageElement,
} from "./types";
import { isInitializedImageElement, toFileId } from "./types";
import type { ImageCacheSlice } from "../../context";
import { loadImage } from "./loadImage";

export function serializeFiles(
  cache: ReadonlyMap<FileId, ImageCacheEntry>,
  elements: readonly ExcalidrawElement[],
): BinaryFiles {
  const referencedFileIds = new Set(
    elements
      .filter(
        (el): el is InitializedExcalidrawImageElement =>
          !el.isDeleted && isInitializedImageElement(el),
      )
      .map((el) => el.fileId),
  );

  const files: BinaryFiles = {} as BinaryFiles;
  for (const [fileId, entry] of cache) {
    if (referencedFileIds.has(fileId)) {
      files[fileId] = {
        id: fileId,
        dataURL: entry.dataURL,
        mimeType: entry.mimeType,
        created: entry.created,
      };
    }
  }
  return files;
}

export async function restoreImageCache(
  files: BinaryFiles,
  addImage: ImageCacheSlice["addImage"],
): Promise<void> {
  const entries = Object.values(files);
  await Promise.all(
    entries.map(async (file: BinaryFileData) => {
      const image = await loadImage(file.dataURL);
      addImage(toFileId(String(file.id)), {
        image,
        mimeType: file.mimeType as ImageCacheEntry["mimeType"],
        dataURL: file.dataURL,
        created: file.created,
      });
    }),
  );
}
