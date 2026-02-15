import type { ProgressInfo } from "@huggingface/transformers";

export type { ProgressInfo, ProgressCallback } from "@huggingface/transformers";

export type BackgroundRemovalStatus = "idle" | "downloading" | "ready" | "processing" | "error";

export type DownloadProgress = {
  /** 0-100 percentage, null when indeterminate */
  percent: number | null;
  /** Currently downloading file name */
  file: string | null;
};

// ── Worker -> Main (outgoing) ────────────────────────────────────────

type ProgressMessage = {
  type: "progress";
  progress: ProgressInfo;
};

type StatusMessage = {
  type: "status";
  status: BackgroundRemovalStatus;
};

type ResultMessage = {
  type: "result";
  maskData: ArrayBuffer;
  width: number;
  height: number;
};

type ErrorMessage = {
  type: "error";
  error: string;
};

export type WorkerOutgoingMessage = ProgressMessage | StatusMessage | ResultMessage | ErrorMessage;

// ── Main -> Worker (incoming) ────────────────────────────────────────

export type WorkerIncomingMessage = {
  type: "process";
  imageData: ArrayBuffer;
  originalWidth: number;
  originalHeight: number;
};
