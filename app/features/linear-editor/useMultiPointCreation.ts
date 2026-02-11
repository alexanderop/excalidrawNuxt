import { shallowRef, triggerRef } from "vue";
import type { Ref, ShallowRef } from "vue";
import { useEventListener } from "@vueuse/core";
import { defineShortcuts } from "#imports";
import type { ExcalidrawElement, ExcalidrawLinearElement } from "~/features/elements/types";
import { isArrowElement } from "~/features/elements/types";
import { mutateElement } from "~/features/elements/mutateElement";
import { pointFrom, snapAngle } from "~/shared/math";
import type { GlobalPoint, LocalPoint } from "~/shared/math";
import {
  getHoveredElementForBinding,
  bindArrowToElement,
  updateArrowEndpoint,
} from "~/features/binding";
import { getSizeFromPoints } from "./pointHandles";

const _excludeIds = new Set<string>();

interface UseMultiPointCreationOptions {
  canvasRef: Readonly<Ref<HTMLCanvasElement | null>>;
  toScene: (screenX: number, screenY: number) => GlobalPoint;
  markStaticDirty: () => void;
  markInteractiveDirty: () => void;
  onFinalize: () => void;
  elements: ShallowRef<readonly ExcalidrawElement[]>;
  zoom: Ref<number>;
  suggestedBindings: ShallowRef<readonly ExcalidrawElement[]>;
}

interface UseMultiPointCreationReturn {
  multiElement: ShallowRef<ExcalidrawLinearElement | null>;
  lastCursorPoint: ShallowRef<GlobalPoint | null>;
  startMultiPoint: (element: ExcalidrawLinearElement) => void;
  finalizeMultiPoint: () => void;
}

export function useMultiPointCreation(
  options: UseMultiPointCreationOptions,
): UseMultiPointCreationReturn {
  const {
    canvasRef,
    toScene,
    markStaticDirty,
    markInteractiveDirty,
    onFinalize,
    elements,
    zoom,
    suggestedBindings,
  } = options;

  const multiElement = shallowRef<ExcalidrawLinearElement | null>(null);
  const lastCursorPoint = shallowRef<GlobalPoint | null>(null);

  function startMultiPoint(element: ExcalidrawLinearElement): void {
    multiElement.value = element;
    const lastPt = element.points.at(-1);
    if (!lastPt) return;
    lastCursorPoint.value = pointFrom<GlobalPoint>(lastPt[0] + element.x, lastPt[1] + element.y);
    markInteractiveDirty();
  }

  function finalizeMultiPoint(): void {
    const el = multiElement.value;
    if (el) {
      // Bind end endpoint if near a shape (arrows only — lines don't bind)
      if (isArrowElement(el)) {
        const lastPt = el.points.at(-1);
        if (lastPt) {
          const endScene = pointFrom<GlobalPoint>(el.x + lastPt[0], el.y + lastPt[1]);
          _excludeIds.clear();
          _excludeIds.add(el.id);
          const candidate = getHoveredElementForBinding(
            endScene,
            elements.value,
            zoom.value,
            _excludeIds,
          );
          if (candidate) {
            bindArrowToElement(el, "end", candidate.element, candidate.fixedPoint);
            updateArrowEndpoint(el, "end", candidate.element);
          }
        }
      }
      suggestedBindings.value = [];
    }

    multiElement.value = null;
    lastCursorPoint.value = null;
    onFinalize();
    markInteractiveDirty();
  }

  useEventListener(canvasRef, "pointerdown", (e: PointerEvent) => {
    const el = multiElement.value;
    if (!el) return;
    if (e.button !== 0) return;

    const scene = toScene(e.offsetX, e.offsetY);
    const lastPt = el.points.at(-1);
    if (!lastPt) return;
    const lastSceneX = lastPt[0] + el.x;
    const lastSceneY = lastPt[1] + el.y;

    let dx = scene[0] - lastSceneX;
    let dy = scene[1] - lastSceneY;

    if (e.shiftKey) {
      const snapped = snapAngle(dx, dy);
      dx = snapped.dx;
      dy = snapped.dy;
    }

    const newRelativePoint = pointFrom<LocalPoint>(lastPt[0] + dx, lastPt[1] + dy);
    const newPoints = [...el.points, newRelativePoint];
    const dims = getSizeFromPoints(newPoints);

    mutateElement(el, {
      points: newPoints,
      width: dims.width,
      height: dims.height,
    });

    // Trigger reactivity since we're mutating the same object
    triggerRef(multiElement);
    markStaticDirty();
    markInteractiveDirty();
  });

  useEventListener(canvasRef, "pointermove", (e: PointerEvent) => {
    if (!multiElement.value) return;

    const scene = toScene(e.offsetX, e.offsetY);
    lastCursorPoint.value = scene;

    // Update suggested bindings based on cursor proximity (arrows only — lines don't bind)
    if (isArrowElement(multiElement.value)) {
      _excludeIds.clear();
      _excludeIds.add(multiElement.value.id);
      const candidate = getHoveredElementForBinding(scene, elements.value, zoom.value, _excludeIds);
      suggestedBindings.value = candidate ? [candidate.element] : [];
    }

    markInteractiveDirty();
  });

  useEventListener(canvasRef, "dblclick", () => {
    if (!multiElement.value) return;
    finalizeMultiPoint();
  });

  defineShortcuts({
    escape: () => {
      if (!multiElement.value) return;
      finalizeMultiPoint();
    },
    enter: () => {
      if (!multiElement.value) return;
      finalizeMultiPoint();
    },
  });

  return {
    multiElement,
    lastCursorPoint,
    startMultiPoint,
    finalizeMultiPoint,
  };
}
