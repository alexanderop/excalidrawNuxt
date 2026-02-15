import type { ProgressInfo } from "@huggingface/transformers";

export type { ProgressInfo } from "@huggingface/transformers";

export type SegmentationStatus = "idle" | "downloading" | "processing" | "compositing" | "error";

export type SegmentationProgress = {
  /** 0-100 percentage, null when indeterminate */
  percent: number | null;
  /** Currently downloading file name */
  file: string | null;
};

export interface MaskResult {
  maskData: ArrayBuffer;
  bbox: { x: number; y: number; width: number; height: number };
  score: number;
  area: number;
  maskWidth: number;
  maskHeight: number;
}

// ── Worker → Main (outgoing) ────────────────────────────────────────

type ProgressMessage = {
  type: "progress";
  progress: ProgressInfo;
};

type StatusMessage = {
  type: "status";
  status: "processing";
};

type ResultMessage = {
  type: "result";
  masks: MaskResult[];
};

type ErrorMessage = {
  type: "error";
  error: string;
};

type CancelledMessage = {
  type: "cancelled";
};

export type WorkerOutMessage =
  | ProgressMessage
  | StatusMessage
  | ResultMessage
  | ErrorMessage
  | CancelledMessage;

// ── Main → Worker (incoming) ────────────────────────────────────────

type ProcessMessage = {
  type: "process";
  imageData: ArrayBuffer;
  width: number;
  height: number;
};

type CancelMessage = {
  type: "cancel";
};

export type WorkerInMessage = ProcessMessage | CancelMessage;

// ── Segmentation config (exported for testability) ───────────────────

export const SEGMENTATION_CONFIG = {
  /** Minimum mask area as fraction of total image area */
  MIN_AREA_FRACTION: 0.005,
  /** Maximum mask area as fraction of total image area */
  MAX_AREA_FRACTION: 0.95,
  /** Maximum number of output masks */
  MAX_MASKS: 30,
  /** Alpha threshold for foreground classification (0-255) */
  ALPHA_THRESHOLD: 128,
} as const;
