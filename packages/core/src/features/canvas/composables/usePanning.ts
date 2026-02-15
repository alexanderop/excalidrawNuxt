import { ref, computed } from "vue";
import type { ComputedRef, Ref, ShallowRef } from "vue";
import { useEventListener, onKeyStroke } from "@vueuse/core";
import { pointFrom } from "../../../shared/math";
import type { GlobalPoint } from "../../../shared/math";
import type { ToolType } from "../../tools/types";
import { isDrawingTool } from "../../tools/types";

const MAX_ZOOM_STEP = 10;

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
  let panButton: number | null = null;
  let middleButtonMoved = false;

  const panningCursor = computed<string>(() => {
    if (isPanning.value) return "grabbing";
    if (spaceHeld.value || activeTool.value === "hand") return "grab";
    if (isDrawingTool(activeTool.value)) return "crosshair";
    return "default";
  });

  // Wheel: zoom (ctrl/meta + wheel), horizontal scroll (shift + wheel), or pan (plain wheel)
  useEventListener(
    canvasRef,
    "wheel",
    (e: WheelEvent) => {
      e.preventDefault();

      if (isPanning.value) return;

      if (e.ctrlKey || e.metaKey) {
        const clampedDelta = Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), MAX_ZOOM_STEP);
        const delta = -clampedDelta * 0.01;
        zoomBy(delta, pointFrom<GlobalPoint>(e.offsetX, e.offsetY));
        return;
      }

      if (e.shiftKey) {
        panBy(-(e.deltaY || e.deltaX), 0);
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

  // Pointer drag while space held, hand tool, or middle mouse button: pan the canvas
  useEventListener(canvasRef, "pointerdown", (e: PointerEvent) => {
    const isMiddleButton = e.button === 1;

    if (isMiddleButton) {
      e.preventDefault();
    }

    if (!isMiddleButton && !spaceHeld.value && activeTool.value !== "hand") return;

    isPanning.value = true;
    panButton = e.button;
    middleButtonMoved = false;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
    canvasRef.value?.setPointerCapture(e.pointerId);
  });

  useEventListener(canvasRef, "pointermove", (e: PointerEvent) => {
    if (!isPanning.value) return;
    middleButtonMoved = true;
    const dx = e.clientX - lastPointerX;
    const dy = e.clientY - lastPointerY;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
    panBy(dx, dy);
  });

  useEventListener(canvasRef, "pointerup", (e: PointerEvent) => {
    if (!isPanning.value) return;
    if (e.button !== panButton) return;
    isPanning.value = false;
    panButton = null;
    canvasRef.value?.releasePointerCapture(e.pointerId);
  });

  // Linux: prevent paste event triggered by middle-click when user was panning
  useEventListener(canvasRef, "paste", (e: ClipboardEvent) => {
    if (middleButtonMoved) {
      e.preventDefault();
    }
  });

  // Reset panning state on window blur (prevents "stuck in pan" bug on Alt+Tab)
  useEventListener(globalThis, "blur", () => {
    if (isPanning.value) {
      isPanning.value = false;
      panButton = null;
      spaceHeld.value = false;
    }
  });

  return { panningCursor, spaceHeld, isPanning };
}
