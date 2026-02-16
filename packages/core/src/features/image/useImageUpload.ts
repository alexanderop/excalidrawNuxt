/* v8 ignore start -- File API upload handlers; requires browser File API simulation not available in vitest browser mode */
import { generateId } from "../../shared/random";
import type { FileId } from "./types";
import { toFileId } from "./types";
import type { ImageCacheSlice } from "../../context";
import { SUPPORTED_IMAGE_TYPES, MAX_IMAGE_FILE_SIZE } from "./constants";

interface UploadResult {
  fileId: FileId;
  image: HTMLImageElement;
  naturalWidth: number;
  naturalHeight: number;
}

function isSupportedMimeType(type: string): boolean {
  return (SUPPORTED_IMAGE_TYPES as readonly string[]).includes(type);
}

function fileToDataURL(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result !== "string") {
        reject(new Error("FileReader result is not a string"));
        return;
      }
      resolve(reader.result);
    });
    reader.addEventListener("error", () => reject(new Error("Failed to read file")));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", () => reject(new Error("Failed to load image")));
    img.src = src;
  });
}

export function useImageUpload(imageCache: ImageCacheSlice) {
  const { addImage } = imageCache;

  async function processFile(file: File | Blob): Promise<UploadResult | null> {
    const mimeType = file.type;
    if (!isSupportedMimeType(mimeType)) return null;
    if (file.size > MAX_IMAGE_FILE_SIZE) return null;

    const fileId = toFileId(generateId());
    const dataURL = await fileToDataURL(file);
    const image = await loadImage(dataURL);

    addImage(fileId, image, mimeType);

    return {
      fileId,
      image,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
    };
  }

  async function processFiles(files: File[]): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    for (const file of files) {
      const result = await processFile(file);
      if (result) results.push(result);
    }
    return results;
  }

  return { processFile, processFiles };
}
