import { AutoModel, AutoProcessor, RawImage, env } from "@huggingface/transformers";
import type { ProgressCallback } from "@huggingface/transformers";
import type { WorkerInMessage, WorkerOutMessage, MaskResult } from "./segmentation.types";
import { SEGMENTATION_CONFIG } from "./segmentation.types";

env.allowLocalModels = false;

// Since we're already in a worker, disable ONNX's internal proxy worker.
// On Safari, JSEP mode (which proxy may trigger) causes severe CPU and memory issues.
if (env.backends?.onnx?.wasm) {
  env.backends.onnx.wasm.proxy = false;
}

const MODEL_ID = "briaai/RMBG-1.4";

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

function post(message: WorkerOutMessage, transfer?: Transferable[]): void {
  if (transfer) {
    self.postMessage(message, transfer);
    return;
  }

  self.postMessage(message);
}

// ── Union-Find ───────────────────────────────────────────────────────

function makeUnionFind(size: number): {
  parent: Int32Array;
  rank: Uint8Array;
  find: (x: number) => number;
  union: (a: number, b: number) => void;
} {
  const parent = new Int32Array(size);
  const rank = new Uint8Array(size);
  for (let i = 0; i < size; i++) parent[i] = i;

  function find(x: number): number {
    let root = x;
    while (parent[root] !== root) root = parent[root]!;
    // Path compression (iterative)
    while (parent[x] !== root) {
      const next = parent[x]!;
      parent[x] = root;
      x = next;
    }
    return root;
  }

  function union(a: number, b: number): void {
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return;
    if (rank[ra]! < rank[rb]!) {
      parent[ra] = rb;
      return;
    }
    if (rank[ra]! > rank[rb]!) {
      parent[rb] = ra;
      return;
    }
    parent[rb] = ra;
    rank[ra]!++;
  }

  return { parent, rank, find, union };
}

// ── Connected component labeling ─────────────────────────────────────

interface ComponentInfo {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  area: number;
}

function unionNeighbors(
  mask: Uint8Array,
  width: number,
  height: number,
  threshold: number,
  uf: ReturnType<typeof makeUnionFind>,
): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (mask[idx]! < threshold) continue;

      if (x > 0 && mask[idx - 1]! >= threshold) uf.union(idx, idx - 1);
      if (y > 0 && mask[idx - width]! >= threshold) uf.union(idx, idx - width);
    }
  }
}

function collectComponents(
  mask: Uint8Array,
  width: number,
  height: number,
  threshold: number,
  find: (x: number) => number,
): Map<number, ComponentInfo> {
  const components = new Map<number, ComponentInfo>();

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (mask[idx]! < threshold) continue;

      const root = find(idx);
      const info = components.get(root);
      if (!info) {
        components.set(root, { minX: x, minY: y, maxX: x, maxY: y, area: 1 });
        continue;
      }
      if (x < info.minX) info.minX = x;
      if (x > info.maxX) info.maxX = x;
      if (y < info.minY) info.minY = y;
      if (y > info.maxY) info.maxY = y;
      info.area++;
    }
  }

  return components;
}

function labelComponents(
  mask: Uint8Array,
  width: number,
  height: number,
  threshold: number,
): { components: Map<number, ComponentInfo>; find: (x: number) => number } {
  const totalPixels = width * height;
  const uf = makeUnionFind(totalPixels);

  unionNeighbors(mask, width, height, threshold, uf);
  const components = collectComponents(mask, width, height, threshold, uf.find);

  return { components, find: uf.find };
}

function buildComponentMasks(
  mask: Uint8Array,
  width: number,
  height: number,
  threshold: number,
  components: Map<number, ComponentInfo>,
  find: (x: number) => number,
): { results: MaskResult[]; transfers: Transferable[] } {
  const totalPixels = width * height;

  // Filter by area fraction, sort by area descending, cap at MAX_MASKS
  const filtered = [...components.entries()]
    .filter(([, info]) => {
      const fraction = info.area / totalPixels;
      return (
        fraction >= SEGMENTATION_CONFIG.MIN_AREA_FRACTION &&
        fraction <= SEGMENTATION_CONFIG.MAX_AREA_FRACTION
      );
    })
    .toSorted(([, a], [, b]) => b.area - a.area)
    .slice(0, SEGMENTATION_CONFIG.MAX_MASKS);

  // Build a fast lookup: root → index in filtered array
  const rootToIndex = new Map<number, number>();
  for (const [i, element] of filtered.entries()) {
    rootToIndex.set(element![0], i);
  }

  // Allocate mask buffers for each component
  const maskBuffers: Uint8Array[] = filtered.map(() => new Uint8Array(totalPixels));

  // Single pass over all pixels to fill mask buffers
  for (let i = 0; i < totalPixels; i++) {
    if (mask[i]! < threshold) continue;
    const root = find(i);
    const bufferIdx = rootToIndex.get(root);
    if (bufferIdx !== undefined) {
      maskBuffers[bufferIdx]![i] = 255;
    }
  }

  const results: MaskResult[] = [];
  const transfers: Transferable[] = [];

  for (const [i, element] of filtered.entries()) {
    const [, info] = element!;
    const buffer = maskBuffers[i]!.buffer as ArrayBuffer;
    results.push({
      maskData: buffer,
      bbox: {
        x: info.minX,
        y: info.minY,
        width: info.maxX - info.minX + 1,
        height: info.maxY - info.minY + 1,
      },
      score: 1,
      area: info.area,
      maskWidth: width,
      maskHeight: height,
    });
    transfers.push(buffer);
  }

  return { results, transfers };
}

// ── Cancel flag ──────────────────────────────────────────────────────

let cancelled = false;

// ── Main handler ─────────────────────────────────────────────────────

async function handleProcess(imageData: ArrayBuffer, width: number, height: number): Promise<void> {
  cancelled = false;

  // eslint-disable-next-line no-restricted-syntax -- tryCatch() from core is unavailable in isolated workers
  try {
    const { model, processor } = await getInstance((progress) => {
      post({ type: "progress", progress });
    });

    if (cancelled) {
      post({ type: "cancelled" });
      return;
    }

    post({ type: "status", status: "processing" });

    // Run RMBG-1.4 to get foreground alpha mask
    const image = new RawImage(new Uint8ClampedArray(imageData), width, height, 4);
    const { pixel_values } = await processor(image);
    const { output } = await model({ input: pixel_values });

    if (cancelled) {
      post({ type: "cancelled" });
      return;
    }

    // Convert model output to alpha mask at original resolution
    const alphaMask = await RawImage.fromTensor(output[0].mul(255).to("uint8")).resize(
      width,
      height,
    );

    if (cancelled) {
      post({ type: "cancelled" });
      return;
    }

    // Connected component labeling on thresholded mask
    const maskData = alphaMask.data as Uint8Array;
    const { components, find } = labelComponents(
      maskData,
      width,
      height,
      SEGMENTATION_CONFIG.ALPHA_THRESHOLD,
    );

    const { results, transfers } = buildComponentMasks(
      maskData,
      width,
      height,
      SEGMENTATION_CONFIG.ALPHA_THRESHOLD,
      components,
      find,
    );

    post({ type: "result", masks: results }, transfers);
  } catch (error) {
    post({
      type: "error",
      error: error instanceof Error ? error.message : "Unknown segmentation error",
    });
  }
}

// ── Message listener ─────────────────────────────────────────────────

self.addEventListener("message", (e: MessageEvent<WorkerInMessage>) => {
  if (e.data.type === "cancel") {
    cancelled = true;
    return;
  }

  if (e.data.type === "process") {
    void handleProcess(e.data.imageData, e.data.width, e.data.height);
  }
});
