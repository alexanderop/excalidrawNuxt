import { watchEffect, type ShallowRef, type ComputedRef } from "vue";
import { exportToCanvas, type ExportOptions } from "@drawvue/core";

export function useExportPreview(
  canvasRef: ShallowRef<HTMLCanvasElement | null>,
  exportOptions: ComputedRef<ExportOptions>,
) {
  watchEffect(() => {
    const target = canvasRef.value;
    if (!target) return;

    const options = exportOptions.value;
    if (options.elements.length === 0) {
      const tCtx = target.getContext("2d");
      if (!tCtx) return;
      target.width = 1;
      target.height = 1;
      tCtx.clearRect(0, 0, 1, 1);
      return;
    }

    // Render at 1x scale for preview, then fit into the container
    const previewCanvas = exportToCanvas({ ...options, scale: 1 });

    const container = target.parentElement;
    if (!container) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const srcW = previewCanvas.width;
    const srcH = previewCanvas.height;

    // Fit the preview proportionally inside the container with some padding
    const fitScale = Math.min((containerWidth * 0.9) / srcW, (containerHeight * 0.9) / srcH, 1);

    const displayW = Math.ceil(srcW * fitScale);
    const displayH = Math.ceil(srcH * fitScale);

    // Use 2x device pixel ratio for crisp rendering
    const dpr = Math.min(window.devicePixelRatio, 2);
    target.width = displayW * dpr;
    target.height = displayH * dpr;
    target.style.width = `${displayW}px`;
    target.style.height = `${displayH}px`;

    const ctx = target.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.drawImage(previewCanvas, 0, 0, displayW, displayH);
  });
}
