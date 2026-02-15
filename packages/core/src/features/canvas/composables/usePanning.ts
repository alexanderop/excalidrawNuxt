import { ref, computed } from "vue";
import type { ComputedRef, Ref, ShallowRef } from "vue";
import { useEventListener, onKeyStroke } from "@vueuse/core";
import { pointFrom } from "../../../shared/math";
import type { GlobalPoint } from "../../../shared/math";
import type { ToolType } from "../../tools/types";
import { isDrawingTool } from "../../tools/types";

interface UsePanningOptions {
  canvasRef: Readonly<Ref<HTMLCanvasElement | null>>;
  panBy: (dx: number, dy: number) => void;
  zoomBy: (delta: number, center?: GlobalPoint) => void;
  activeTool: ShallowRef<ToolType>;
}

interface UsePanningReturn {
  panningCursor: ComputedRef<string>;
  spaceHeld: Ref<boolean>;
  isPanning: Ref<boolean>;
}

export function usePanning({
  canvasRef,
  panBy,
  zoomBy,
  activeTool,
}: UsePanningOptions): UsePanningReturn {
  const spaceHeld = ref(false);
  const isPanning = ref(false);
  let lastPointerX = 0;
  let lastPointerY = 0;

  const panningCursor = computed<string>(() => {
    if (isPanning.value) return "grabbing";
    if (spaceHeld.value || activeTool.value === "hand") return "grab";
    if (isDrawingTool(activeTool.value)) return "crosshair";
    return "default";
  });

  // Wheel: zoom (ctrl/meta + wheel) or pan (plain wheel)
  useEventListener(
    canvasRef,
    "wheel",
    (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const delta = -e.deltaY * 0.01;
        zoomBy(delta, pointFrom<GlobalPoint>(e.offsetX, e.offsetY));
        return;
      }
      panBy(-e.deltaX, -e.deltaY);
    },
    { passive: false },
  );

  // Space key: toggle grab cursor
  onKeyStroke(
    " ",
    (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLElement &&
        (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")
      )
        return;
      e.preventDefault();
      spaceHeld.value = true;
    },
    { eventName: "keydown", target: document, dedupe: true },
  );

  onKeyStroke(
    " ",
    () => {
      spaceHeld.value = false;
      isPanning.value = false;
    },
    { eventName: "keyup", target: document },
  );

  // Pointer drag while space held or hand tool: pan the canvas
  useEventListener(canvasRef, "pointerdown", (e: PointerEvent) => {
    if (!spaceHeld.value && activeTool.value !== "hand") return;
    isPanning.value = true;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
    canvasRef.value?.setPointerCapture(e.pointerId);
  });

  useEventListener(canvasRef, "pointermove", (e: PointerEvent) => {
    if (!isPanning.value) return;
    const dx = e.clientX - lastPointerX;
    const dy = e.clientY - lastPointerY;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
    panBy(dx, dy);
  });

  useEventListener(canvasRef, "pointerup", (e: PointerEvent) => {
    if (!isPanning.value) return;
    isPanning.value = false;
    canvasRef.value?.releasePointerCapture(e.pointerId);
  });

  return { panningCursor, spaceHeld, isPanning };
}
