import type { ExportOptions, CanvasExportMimeType } from "./types";
import { exportToCanvas } from "./exportToCanvas";

export async function exportToBlob(
  options: ExportOptions,
  mimeType: CanvasExportMimeType = "image/png",
  quality?: number,
): Promise<Blob> {
  const canvas = exportToCanvas(options);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas toBlob returned null"));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality,
    );
  });
}
