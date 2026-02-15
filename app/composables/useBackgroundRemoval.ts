import { ref, shallowRef, onUnmounted } from "vue";

const MAX_IMAGE_SIZE = 1024;

interface WorkerProgress {
  status?: string;
  file?: string;
  loaded?: number;
  total?: number;
}

export type BackgroundRemovalStatus = "idle" | "downloading" | "ready" | "processing" | "error";

export interface DownloadProgress {
  /** 0–100 percentage, null when indeterminate */
  percent: number | null;
  /** Currently downloading file name */
  file: string | null;
}

export function useBackgroundRemoval() {
  const worker = shallowRef<Worker | null>(null);
  const status = ref<BackgroundRemovalStatus>("idle");
  const errorMessage = ref<string | null>(null);
  const downloadProgress = ref<DownloadProgress>({ percent: null, file: null });

  function handleWorkerError(): void {
    status.value = "error";
    errorMessage.value = "Background removal failed unexpectedly.";
    worker.value = null;
  }

  function ensureWorker(): Worker {
    if (!worker.value) {
      worker.value = new Worker(
        new URL("../workers/background-removal.worker.ts", import.meta.url),
        { type: "module" },
      );
      worker.value.addEventListener("error", handleWorkerError);
    }
    return worker.value;
  }

  function updateDownloadProgress(p: WorkerProgress | undefined): void {
    if (!p || p.status !== "progress" || !p.total || p.total <= 0) return;
    downloadProgress.value = {
      percent: Math.round(((p.loaded ?? 0) / p.total) * 100),
      file: p.file ?? null,
    };
  }

  async function removeBackground(img: HTMLImageElement): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
      const w = ensureWorker();

      function handleMessage(e: MessageEvent): void {
        switch (e.data.type) {
          case "progress": {
            status.value = "downloading";
            updateDownloadProgress(e.data.progress as WorkerProgress | undefined);
            break;
          }
          case "status": {
            status.value = e.data.status;
            break;
          }
          case "result": {
            w.removeEventListener("message", handleMessage);
            status.value = "ready";
            resolve(
              compositeAlphaMask(
                img,
                new Uint8ClampedArray(e.data.maskData),
                e.data.width,
                e.data.height,
              ),
            );
            break;
          }
          case "error": {
            w.removeEventListener("message", handleMessage);
            status.value = "error";
            errorMessage.value = e.data.error;
            resolve(null);
            break;
          }
        }
      }

      w.addEventListener("message", handleMessage);

      const { buffer, width, height } = imageToPixelBuffer(img, MAX_IMAGE_SIZE);
      w.postMessage(
        { type: "process", imageData: buffer, originalWidth: width, originalHeight: height },
        [buffer],
      );
    });
  }

  onUnmounted(() => {
    worker.value?.terminate();
    worker.value = null;
  });

  return { status, errorMessage, downloadProgress, removeBackground };
}

/**
 * Convert an HTMLImageElement to a raw RGBA pixel ArrayBuffer,
 * downscaling if any dimension exceeds maxSize.
 */
function imageToPixelBuffer(
  img: HTMLImageElement,
  maxSize: number,
): { buffer: ArrayBuffer; width: number; height: number } {
  let { naturalWidth: width, naturalHeight: height } = img;

  if (width > maxSize || height > maxSize) {
    const scale = maxSize / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  return { buffer: imageData.data.buffer, width, height };
}

/**
 * Apply a single-channel alpha mask to the original image,
 * producing a new HTMLImageElement with transparent background.
 */
function compositeAlphaMask(
  original: HTMLImageElement,
  maskData: Uint8ClampedArray,
  width: number,
  height: number,
): HTMLImageElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  // Draw original image at mask resolution
  ctx.drawImage(original, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data;

  // Apply mask as alpha channel (one mask value per pixel)
  for (const [i, maskDatum] of maskData.entries()) {
    pixels[i * 4 + 3] = maskDatum!;
  }

  ctx.putImageData(imageData, 0, 0);

  const result = new Image();
  result.src = canvas.toDataURL("image/png");
  return result;
}
