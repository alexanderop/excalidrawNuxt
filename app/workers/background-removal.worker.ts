import { AutoModel, AutoProcessor, RawImage, env } from "@huggingface/transformers";
import type { ProgressCallback } from "@huggingface/transformers";
import type { WorkerIncomingMessage, WorkerOutgoingMessage } from "./background-removal.types";
import type { ProgressInfo } from "./background-removal.types";

env.allowLocalModels = false;

// Since we're already in a worker, disable ONNX's internal proxy worker.
// On Safari, JSEP mode (which proxy may trigger) causes severe CPU and memory issues.
if (env.backends?.onnx?.wasm) {
  env.backends.onnx.wasm.proxy = false;
}

const MODEL_ID = "briaai/RMBG-1.4";
const RGBA_CHANNELS = 4;

type Pipeline = {
  model: Awaited<ReturnType<typeof AutoModel.from_pretrained>>;
  processor: Awaited<ReturnType<typeof AutoProcessor.from_pretrained>>;
};

// Singleton -- store the PROMISE to handle concurrent getInstance() calls
let pipelinePromise: Promise<Pipeline> | null = null;

async function loadPipeline(progressCallback?: ProgressCallback): Promise<Pipeline> {
  const model = await AutoModel.from_pretrained(MODEL_ID, {
    // RMBG-1.4 requires model_type: "custom" which is not in the library's PretrainedConfig type
    // @ts-expect-error -- custom model config override
    config: { model_type: "custom" },
    progress_callback: progressCallback,
  });
  const processor = await AutoProcessor.from_pretrained(MODEL_ID, {
    config: {
      do_normalize: true,
      do_pad: false,
      do_rescale: true,
      do_resize: true,
      image_mean: [0.5, 0.5, 0.5],
      feature_extractor_type: "ImageFeatureExtractor",
      image_std: [1, 1, 1],
      resample: 2,
      rescale_factor: 0.003_921_568_627_450_98,
      size: { width: 1024, height: 1024 },
    },
  });
  return { model, processor };
}

function getInstance(progressCallback?: ProgressCallback): Promise<Pipeline> {
  pipelinePromise ??= loadPipeline(progressCallback);
  return pipelinePromise;
}

function post(message: WorkerOutgoingMessage, transfer?: Transferable[]): void {
  if (transfer) {
    self.postMessage(message, transfer);
    return;
  }
  self.postMessage(message);
}

function sendProgress(progress: ProgressInfo): void {
  post({ type: "progress", progress });
}

async function handleMessage(e: MessageEvent<WorkerIncomingMessage>): Promise<void> {
  if (e.data.type !== "process") return;

  const { imageData, originalWidth, originalHeight } = e.data;

  // eslint-disable-next-line no-restricted-syntax -- tryCatch() from core is unavailable in isolated workers
  try {
    const { model, processor } = await getInstance(sendProgress);

    post({ type: "status", status: "processing" });

    // Reconstruct RawImage from transferred ArrayBuffer
    const image = new RawImage(
      new Uint8ClampedArray(imageData),
      originalWidth,
      originalHeight,
      RGBA_CHANNELS,
    );

    const { pixel_values } = await processor(image);
    const { output } = await model({ input: pixel_values });

    // Resize mask to original dimensions
    const mask = await RawImage.fromTensor(output[0].mul(255).to("uint8")).resize(
      originalWidth,
      originalHeight,
    );

    // Transfer mask buffer (zero-copy)
    const maskBuffer = mask.data.buffer as ArrayBuffer;
    post({ type: "result", maskData: maskBuffer, width: originalWidth, height: originalHeight }, [
      maskBuffer,
    ]);
  } catch (error) {
    post({
      type: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

self.addEventListener("message", (e: MessageEvent<WorkerIncomingMessage>) => {
  void handleMessage(e);
});
