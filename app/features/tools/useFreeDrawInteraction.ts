import { shallowRef } from "vue";
import type { Ref, ShallowRef } from "vue";
import { useEventListener } from "@vueuse/core";
import { getBoundsFromPoints } from "@excalidraw/element";
import type { ExcalidrawElement, ExcalidrawFreeDrawElement } from "~/features/elements/types";
import { createElement } from "~/features/elements/createElement";
import { mutateElement } from "~/features/elements/mutateElement";
import { useStyleDefaults } from "~/features/properties/composables/useStyleDefaults";
import { pointFrom } from "~/shared/math";
import type { GlobalPoint, LocalPoint } from "~/shared/math";
import type { ToolType } from "./types";
import { isFreeDrawTool } from "./types";

interface UseFreeDrawInteractionOptions {
  canvasRef: Readonly<Ref<HTMLCanvasElement | null>>;
  activeTool: ShallowRef<ToolType>;
  spaceHeld: Ref<boolean>;
  isPanning: Ref<boolean>;
  toScene: (screenX: number, screenY: number) => GlobalPoint;
  onElementCreated: (element: ExcalidrawElement) => void;
  markNewElementDirty: () => void;
  markStaticDirty: () => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
}

interface UseFreeDrawInteractionReturn {
  newFreeDrawElement: ShallowRef<ExcalidrawFreeDrawElement | null>;
  finalizeFreeDrawIfActive: () => void;
}

export function useFreeDrawInteraction(
  options: UseFreeDrawInteractionOptions,
): UseFreeDrawInteractionReturn {
  const {
    canvasRef,
    activeTool,
    spaceHeld,
    isPanning,
    toScene,
    onElementCreated,
    markNewElementDirty,
    markStaticDirty,
  } = options;

  const { getStyleOverrides } = useStyleDefaults();

  const newFreeDrawElement = shallowRef<ExcalidrawFreeDrawElement | null>(null);
  let originX = 0;
  let originY = 0;
  let lastX = 0;
  let lastY = 0;

  useEventListener(canvasRef, "pointerdown", (e: PointerEvent) => {
    if (spaceHeld.value || isPanning.value) return;
    if (!isFreeDrawTool(activeTool.value)) return;
    if (e.button !== 0) return;

    options.onInteractionStart?.();
    const scene = toScene(e.offsetX, e.offsetY);
    originX = scene[0];
    originY = scene[1];
    lastX = 0;
    lastY = 0;

    const el = createElement("freedraw", originX, originY, getStyleOverrides());

    // Detect if we have real pressure (mouse/trackpad sends 0.5)
    const simulatePressure = e.pressure === 0 || e.pressure === 0.5;
    mutateElement(el, { simulatePressure });

    newFreeDrawElement.value = el;
    canvasRef.value?.setPointerCapture(e.pointerId);
  });

  useEventListener(canvasRef, "pointermove", (e: PointerEvent) => {
    const el = newFreeDrawElement.value;
    if (!el) return;

    const scene = toScene(e.offsetX, e.offsetY);
    const dx = scene[0] - originX;
    const dy = scene[1] - originY;

    // Skip duplicate points
    if (dx === lastX && dy === lastY) return;
    lastX = dx;
    lastY = dy;

    const newPoints = [...el.points, pointFrom<LocalPoint>(dx, dy)];
    const newPressures = el.simulatePressure ? el.pressures : [...el.pressures, e.pressure];

    mutateElement(el, {
      points: newPoints,
      pressures: newPressures,
    });

    markNewElementDirty();
  });

  function finalizeElement(el: ExcalidrawFreeDrawElement, pointerId: number): void {
    canvasRef.value?.releasePointerCapture(pointerId);

    // For single-point clicks (dots), nudge the last point slightly
    if (el.points.length < 2) {
      const firstPt = el.points[0]!;
      mutateElement(el, {
        points: [firstPt, pointFrom<LocalPoint>(firstPt[0] + 0.0001, firstPt[1] + 0.0001)],
      });
    }

    const [minX, minY, maxX, maxY] = getBoundsFromPoints(el.points);

    mutateElement(el, {
      width: maxX - minX,
      height: maxY - minY,
      lastCommittedPoint: el.points.at(-1) ?? null,
    });

    onElementCreated(el);
    options.onInteractionEnd?.();
    newFreeDrawElement.value = null;
    markNewElementDirty();
    markStaticDirty();
  }

  useEventListener(canvasRef, "pointerup", (e: PointerEvent) => {
    const el = newFreeDrawElement.value;
    if (!el) return;
    finalizeElement(el, e.pointerId);
    // Tool stays active — no setTool("selection")
  });

  function finalizeFreeDrawIfActive(): void {
    const el = newFreeDrawElement.value;
    if (!el) return;
    finalizeElement(el, 0);
  }

  return { newFreeDrawElement, finalizeFreeDrawIfActive };
}
