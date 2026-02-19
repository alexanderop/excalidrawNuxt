import type { ImageMimeType } from "./constants";
import type { Result } from "../../utils/tryCatch";

export function imageToDataURL(image: HTMLImageElement, mimeType: ImageMimeType): Result<string> {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return [new Error("Failed to get canvas 2d context"), null];
  ctx.drawImage(image, 0, 0);
  return [null, canvas.toDataURL(mimeType)];
}
