import { ref, shallowRef, onUnmounted } from "vue";
import type {
  BackgroundRemovalStatus,
  DownloadProgress,
  ProgressInfo,
  WorkerOutgoingMessage,
} from "../workers/background-removal.types";

export type {
  BackgroundRemovalStatus,
  DownloadProgress,
} from "../workers/background-removal.types";

const MAX_IMAGE_SIZE = 1024;
const WORKER_IDLE_TIMEOUT_MS = 120_000;

export function useBackgroundRemoval() {
  const worker = shallowRef<Worker | null>(null);
  const status = ref<BackgroundRemovalStatus>("idle");
  const errorMessage = ref<string | null>(null);
  const downloadProgress = ref<DownloadProgress>({ percent: null, file: null });
  let idleTimer: ReturnType<typeof setTimeout> | null = null;

  function clearIdleTimer(): void {
    if (idleTimer !== null) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
  }

  function startIdleTimer(): void {
    clearIdleTimer();
    idleTimer = setTimeout(() => {
      worker.value?.terminate();
      worker.value = null;
    }, WORKER_IDLE_TIMEOUT_MS);
  }

  function handleWorkerError(): void {
    status.value = "error";
    errorMessage.value = "Background removal failed unexpectedly.";
    worker.value = null;
    clearIdleTimer();
  }

  function ensureWorker(): Worker {
    clearIdleTimer();
    if (!worker.value) {
      worker.value = new Worker(
        new URL("../workers/background-removal.worker.ts", import.meta.url),
        { type: "module" },
      );
      worker.value.addEventListener("error", handleWorkerError);
    }
    return worker.value;
  }

  function updateDownloadProgress(p: ProgressInfo): void {
    if (p.status !== "progress") return;
    if (p.total <= 0) return;
    downloadProgress.value = {
      percent: Math.round((p.loaded / p.total) * 100),
      file: p.file,
    };
  }

  async function removeBackground(img: HTMLImageElement): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
      const w = ensureWorker();

      function handleMessage(e: MessageEvent<WorkerOutgoingMessage>): void {
        const msg = e.data;
        switch (msg.type) {
          case "progress": {
            status.value = "downloading";
            updateDownloadProgress(msg.progress);
            break;
          }
          case "status": {
            status.value = msg.status;
            break;
          }
          case "result": {
            w.removeEventListener("message", handleMessage);
            status.value = "ready";
            startIdleTimer();
            void compositeAlphaMask(
              img,
              new Uint8ClampedArray(msg.maskData),
              msg.width,
              msg.height,
            ).then(resolve);
            break;
          }
          case "error": {
            w.removeEventListener("message", handleMessage);
            status.value = "error";
            errorMessage.value = msg.error;
            startIdleTimer();
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
    clearIdleTimer();
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
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get OffscreenCanvas 2d context");
  ctx.drawImage(img, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  return { buffer: imageData.data.buffer, width, height };
}

/**
 * Apply a single-channel alpha mask to the original image,
 * producing a new HTMLImageElement with transparent background.
 * Uses async toBlob() to avoid blocking the main thread.
 */
async function compositeAlphaMask(
  original: HTMLImageElement,
  maskData: Uint8ClampedArray,
  width: number,
  height: number,
): Promise<HTMLImageElement> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas 2d context");

  // Draw original image at mask resolution
  ctx.drawImage(original, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data;

  // Apply mask as alpha channel (plain for loop — avoids 1M+ iterator allocations)
  for (const [i, maskDatum] of maskData.entries()) {
    // maskDatum is always defined here — entries() yields [index, value] pairs
    // for every element in the typed array
    pixels[i * 4 + 3] = maskDatum!;
  }

  ctx.putImageData(imageData, 0, 0);

  // Use async toBlob + createObjectURL to avoid blocking the main thread with PNG encoding
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (!b) {
        reject(new Error("canvas.toBlob returned null"));
        return;
      }
      resolve(b);
    }, "image/png");
  });
  const url = URL.createObjectURL(blob);

  return new Promise<HTMLImageElement>((resolve) => {
    const result = new Image();
    result.addEventListener("load", () => resolve(result));
    result.src = url;
  });
}
