import { shallowRef, triggerRef } from "vue";
import type { ShallowRef } from "vue";
import type { FileId, ImageCacheEntry, ImageMimeType } from "./types";
import { toFileId } from "./types";
import { useDrawVue } from "../../context";
import { generateId } from "../../shared/random";
import { imageToDataURL } from "./imageToDataURL";
import type { Result } from "../../utils/tryCatch";

export interface UseImageCacheReturn {
  cache: ShallowRef<Map<FileId, ImageCacheEntry>>;
  addImage: (id: FileId, entry: ImageCacheEntry) => void;
  registerImage: (image: HTMLImageElement, mimeType: ImageMimeType) => Result<FileId>;
  getImage: (id: FileId) => HTMLImageElement | undefined;
  getEntry: (id: FileId) => ImageCacheEntry | undefined;
  hasImage: (id: FileId) => boolean;
  removeImage: (id: FileId) => void;
  $reset: () => void;
}

export function createImageCache(): UseImageCacheReturn {
  const cache = shallowRef(new Map<FileId, ImageCacheEntry>());

  function addImage(id: FileId, entry: ImageCacheEntry): void {
    cache.value.set(id, entry);
    triggerRef(cache);
  }

  function registerImage(image: HTMLImageElement, mimeType: ImageMimeType): Result<FileId> {
    const [dataURLError, dataURL] = imageToDataURL(image, mimeType);
    if (dataURLError) return [dataURLError, null];

    const fileId = toFileId(generateId());
    addImage(fileId, { image, mimeType, dataURL, created: Date.now() });
    return [null, fileId];
  }

  function getImage(id: FileId): HTMLImageElement | undefined {
    return cache.value.get(id)?.image;
  }

  function getEntry(id: FileId): ImageCacheEntry | undefined {
    return cache.value.get(id);
  }

  function hasImage(id: FileId): boolean {
    return cache.value.has(id);
  }

  function removeImage(id: FileId): void {
    cache.value.delete(id);
    triggerRef(cache);
  }

  function $reset(): void {
    cache.value.clear();
    triggerRef(cache);
  }

  return { cache, addImage, registerImage, getImage, getEntry, hasImage, removeImage, $reset };
}

export function useImageCache(): UseImageCacheReturn {
  return useDrawVue().imageCache;
}
