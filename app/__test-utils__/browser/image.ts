import { onTestFinished } from "vitest";
import type { FileId } from "@drawvue/core";
import { API } from "./api";

/**
 * Create a solid-colored test image as an HTMLImageElement.
 * Uses an offscreen canvas to produce a deterministic image.
 */
export function createTestImage(
  width: number,
  height: number,
  color: string,
): Promise<{ image: HTMLImageElement; dataURL: string }> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get 2d context for test image");
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);

  const dataURL = canvas.toDataURL("image/png");
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve({ image: img, dataURL }));
    img.addEventListener("error", reject);
    img.src = dataURL;
  });
}

/** Populate the image cache with a test image; auto-resets on test finish. */
export async function addTestImage(
  fileId: FileId,
  width: number,
  height: number,
  color: string,
): Promise<void> {
  const { addImage, $reset } = API.h.imageCache;
  const { image, dataURL } = await createTestImage(width, height, color);
  addImage(fileId, { image, mimeType: "image/png", dataURL, created: Date.now() });
  onTestFinished(() => $reset());
}
