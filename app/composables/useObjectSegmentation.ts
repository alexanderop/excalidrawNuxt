import { ref, shallowRef, onUnmounted } from "vue";
import type {
  SegmentationStatus,
  SegmentationProgress,
  WorkerOutMessage,
  MaskResult,
} from "../workers/segmentation.types";

export type { SegmentationStatus, SegmentationProgress } from "../workers/segmentation.types";

export interface ProcessedSegment {
  image: HTMLImageElement;
  bbox: { x: number; y: number; width: number; height: number };
  maskWidth: number;
  maskHeight: number;
}

const MAX_IMAGE_SIZE = 1024;
const WORKER_IDLE_TIMEOUT_MS = 120_000;
const RGBA_CHANNELS = 4;

export function useObjectSegmentation() {
  const worker = shallowRef<Worker | null>(null);
  const status = ref<SegmentationStatus>("idle");
  const errorMessage = ref<string | null>(null);
  const progress = ref<SegmentationProgress>({ percent: null, file: null });
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingResolve: ((value: ProcessedSegment[] | null) => void) | null = null;

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

  function handleWorkerError(e: ErrorEvent): void {
    console.error("[segmentation] Worker error:", e.message);
    status.value = "error";
    errorMessage.value = e.message || "Object segmentation failed unexpectedly.";
    worker.value = null;
    clearIdleTimer();
    // Resolve the pending segmentObjects promise so the caller doesn't hang
    if (pendingResolve) {
      pendingResolve(null);
      pendingResolve = null;
    }
  }

  function ensureWorker(): Worker {
    clearIdleTimer();
    if (!worker.value) {
      worker.value = new Worker(new URL("../workers/segmentation.worker.ts", import.meta.url), {
        type: "module",
      });
      worker.value.addEventListener("error", handleWorkerError);
    }
    return worker.value;
  }

  function cancel(): void {
    if (worker.value && status.value !== "idle" && status.value !== "error") {
      worker.value.postMessage({ type: "cancel" });
    }
  }

  function handleProgress(msg: Extract<WorkerOutMessage, { type: "progress" }>): void {
    status.value = "downloading";
    if (msg.progress.status === "progress" && msg.progress.total > 0) {
      progress.value = {
        percent: Math.round((msg.progress.loaded / msg.progress.total) * 100),
        file: msg.progress.file,
      };
    }
  }

  function handleStatus(msg: Extract<WorkerOutMessage, { type: "status" }>): void {
    status.value = msg.status;
  }

  function resetAfterDone(): void {
    startIdleTimer();
  }

  async function segmentObjects(img: HTMLImageElement): Promise<ProcessedSegment[] | null> {
    return new Promise((resolve) => {
      const w = ensureWorker();
      // Store resolve so handleWorkerError can settle the promise on crash
      pendingResolve = resolve;

      function handleMessage(e: MessageEvent<WorkerOutMessage>): void {
        const msg = e.data;
        switch (msg.type) {
          case "progress": {
            handleProgress(msg);
            break;
          }
          case "status": {
            handleStatus(msg);
            break;
          }
          case "result": {
            w.removeEventListener("message", handleMessage);
            pendingResolve = null;
            status.value = "compositing";
            void compositeMasks(img, msg.masks).then((segments) => {
              status.value = "idle";
              resetAfterDone();
              resolve(segments);
            });
            break;
          }
          case "error": {
            w.removeEventListener("message", handleMessage);
            pendingResolve = null;
            console.error("[segmentation] Worker reported error:", msg.error);
            status.value = "error";
            errorMessage.value = msg.error;
            resetAfterDone();
            resolve(null);
            break;
          }
          case "cancelled": {
            w.removeEventListener("message", handleMessage);
            pendingResolve = null;
            status.value = "idle";
            resetAfterDone();
            resolve(null);
            break;
          }
        }
      }

      w.addEventListener("message", handleMessage);

      const { buffer, width, height } = imageToPixelBuffer(img, MAX_IMAGE_SIZE);
      w.postMessage({ type: "process", imageData: buffer, width, height }, [buffer]);
    });
  }

  onUnmounted(() => {
    clearIdleTimer();
    worker.value?.terminate();
    worker.value = null;
  });

  return { status, errorMessage, progress, segmentObjects, cancel };
}

// ── Helpers ──────────────────────────────────────────────────────────

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
  return { buffer: imageData.data.buffer as ArrayBuffer, width, height };
}

async function compositeMasks(
  original: HTMLImageElement,
  masks: MaskResult[],
): Promise<ProcessedSegment[]> {
  const segments: ProcessedSegment[] = [];

  for (const mask of masks) {
    const segment = await compositeSingleMask(original, mask);
    if (segment) segments.push(segment);
  }

  return segments;
}

async function compositeSingleMask(
  original: HTMLImageElement,
  mask: MaskResult,
): Promise<ProcessedSegment | null> {
  const { bbox, maskWidth, maskHeight } = mask;
  if (bbox.width === 0 || bbox.height === 0) return null;

  const maskData = new Uint8Array(mask.maskData);

  // Create a canvas sized to the bbox
  const canvas = document.createElement("canvas");
  canvas.width = bbox.width;
  canvas.height = bbox.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Draw the original image offset by bbox position
  // Scale from mask coordinates to original image coordinates
  const scaleX = original.naturalWidth / maskWidth;
  const scaleY = original.naturalHeight / maskHeight;

  ctx.drawImage(
    original,
    bbox.x * scaleX,
    bbox.y * scaleY,
    bbox.width * scaleX,
    bbox.height * scaleY,
    0,
    0,
    bbox.width,
    bbox.height,
  );

  // Apply mask as alpha using Math.min compositing
  const imageData = ctx.getImageData(0, 0, bbox.width, bbox.height);
  const pixels = imageData.data;

  for (let y = 0; y < bbox.height; y++) {
    for (let x = 0; x < bbox.width; x++) {
      const pixelIdx = (y * bbox.width + x) * RGBA_CHANNELS;
      const maskIdx = (y + bbox.y) * maskWidth + (x + bbox.x);
      const maskAlpha = maskData[maskIdx] ?? 0;
      const existingAlpha = pixels[pixelIdx + 3] ?? 255;
      pixels[pixelIdx + 3] = Math.min(existingAlpha, maskAlpha);
    }
  }

  ctx.putImageData(imageData, 0, 0);

  // Convert to blob → object URL → HTMLImageElement
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

  return new Promise<ProcessedSegment>((resolve) => {
    const result = new Image();
    result.onload = () => resolve({ image: result, bbox, maskWidth, maskHeight });
    result.src = url;
  });
}
