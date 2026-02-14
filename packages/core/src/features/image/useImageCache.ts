import { shallowRef, triggerRef } from "vue";
import type { ShallowRef } from "vue";
import type { FileId, ImageCacheEntry } from "./types";
import { useDrawVue } from "../../context";

export interface UseImageCacheReturn {
  cache: ShallowRef<Map<FileId, ImageCacheEntry>>;
  addImage: (id: FileId, image: HTMLImageElement, mimeType: string) => void;
  getImage: (id: FileId) => HTMLImageElement | undefined;
  getEntry: (id: FileId) => ImageCacheEntry | undefined;
  hasImage: (id: FileId) => boolean;
  removeImage: (id: FileId) => void;
  $reset: () => void;
}

export function createImageCache(): UseImageCacheReturn {
  const cache = shallowRef(new Map<FileId, ImageCacheEntry>());

  function addImage(id: FileId, image: HTMLImageElement, mimeType: string): void {
    cache.value.set(id, { image, mimeType });
    triggerRef(cache);
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

  return { cache, addImage, getImage, getEntry, hasImage, removeImage, $reset };
}

export function useImageCache(): UseImageCacheReturn {
  return useDrawVue().imageCache;
}
