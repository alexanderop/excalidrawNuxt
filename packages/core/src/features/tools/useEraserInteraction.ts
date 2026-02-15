import { shallowRef, triggerRef } from "vue";
import type { Ref, ShallowRef } from "vue";
import { useEventListener } from "@vueuse/core";
import type { ExcalidrawElement, ElementsMap } from "../elements/types";
import { isEraserTool } from "./types";
import type { ToolType } from "./types";
import { eraserTest } from "./eraserTest";
import { getElementAtPosition } from "../selection/hitTest";
import { lineSegment } from "../../shared/math";
import type { GlobalPoint, LineSegment } from "../../shared/math";
import { getElementsInGroup } from "../groups/groupUtils";
import { getBoundTextElement } from "../elements";

const CLICK_THRESHOLD = 3;
const MAX_TRAIL_POINTS = 500;

interface UseEraserInteractionOptions {
  canvasRef: Readonly<Ref<HTMLCanvasElement | null>>;
  activeTool: ShallowRef<ToolType>;
  spaceHeld: Ref<boolean>;
  isPanning: Ref<boolean>;
  toScene: (screenX: number, screenY: number) => GlobalPoint;
  zoom: Ref<number>;
  elements: ShallowRef<readonly ExcalidrawElement[]>;
  elementMap: ElementsMap;

  onDelete: (elementsToDelete: readonly ExcalidrawElement[]) => void;

  markStaticDirty: () => void;
  markInteractiveDirty: () => void;

  onInteractionStart: () => void;
  recordAction: (fn: () => void) => void;
}

interface UseEraserInteractionReturn {
  pendingErasureIds: ShallowRef<ReadonlySet<string>>;
  eraserTrailPoints: ShallowRef<readonly GlobalPoint[]>;
  isRestoreMode: ShallowRef<boolean>;
  cancelEraserIfActive: () => void;
}

export function useEraserInteraction(
  options: UseEraserInteractionOptions,
): UseEraserInteractionReturn {
  const {
    canvasRef,
    activeTool,
    spaceHeld,
    isPanning,
    toScene,
    zoom,
    elements,
    elementMap,
    onDelete,
    markStaticDirty,
    markInteractiveDirty,
    onInteractionStart,
    recordAction,
  } = options;

  const pendingErasureIds = shallowRef<ReadonlySet<string>>(new Set());
  const eraserTrailPoints = shallowRef<readonly GlobalPoint[]>([]);
  const isRestoreMode = shallowRef(false);

  let isErasing = false;
  let startScreenX = 0;
  let startScreenY = 0;
  let activePointerId = -1;

  // ── Helpers ──────────────────────────────────────────────────────────

  function getVisibleCandidates(): readonly ExcalidrawElement[] {
    return elements.value.filter((el) => !el.isDeleted && !el.locked);
  }

  function applyBoundText(el: ExcalidrawElement, ids: Set<string>, op: "add" | "delete"): void {
    const boundText = getBoundTextElement(el, elementMap);
    if (boundText) ids[op](boundText.id);
  }

  function applyGroupsAndBindings(elementId: string, ids: Set<string>, op: "add" | "delete"): void {
    const el = elements.value.find((e) => e.id === elementId);
    if (!el) return;

    const outermostGroupId = el.groupIds.at(-1);
    if (outermostGroupId) {
      for (const member of getElementsInGroup(elementMap, outermostGroupId)) {
        ids[op](member.id);
        applyBoundText(member, ids, op);
      }
    }

    applyBoundText(el, ids, op);
    if (el.type === "text" && "containerId" in el && el.containerId) {
      ids[op](el.containerId);
    }
  }

  function updatePendingIds(pathSegment: LineSegment<GlobalPoint>, restore: boolean): void {
    const candidates = getVisibleCandidates();
    const ids = new Set(pendingErasureIds.value);

    for (const el of candidates) {
      if (restore && ids.has(el.id)) {
        if (eraserTest(pathSegment, el, elementMap, zoom.value)) {
          applyGroupsAndBindings(el.id, ids, "delete");
          ids.delete(el.id);
        }
        continue;
      }

      if (!restore && !ids.has(el.id) && eraserTest(pathSegment, el, elementMap, zoom.value)) {
        ids.add(el.id);
        applyGroupsAndBindings(el.id, ids, "add");
      }
    }

    pendingErasureIds.value = ids;
    triggerRef(pendingErasureIds);
  }

  function resolveClickErase(e: PointerEvent): readonly ExcalidrawElement[] {
    const scene = toScene(e.offsetX, e.offsetY);
    const hitElement = getElementAtPosition(scene, elements.value, zoom.value);
    if (!hitElement) return [];

    const ids = new Set<string>([hitElement.id]);
    applyGroupsAndBindings(hitElement.id, ids, "add");
    return elements.value.filter((el) => ids.has(el.id));
  }

  function resolveDragErase(): readonly ExcalidrawElement[] {
    const ids = pendingErasureIds.value;
    return elements.value.filter((el) => ids.has(el.id));
  }

  function clearEraserState(): void {
    eraserTrailPoints.value = [];
    pendingErasureIds.value = new Set();
    isRestoreMode.value = false;
  }

  useEventListener(canvasRef, "pointerdown", (e: PointerEvent) => {
    if (spaceHeld.value || isPanning.value) return;
    if (!isEraserTool(activeTool.value)) return;
    if (e.button !== 0) return;

    onInteractionStart();
    isErasing = true;
    activePointerId = e.pointerId;
    startScreenX = e.offsetX;
    startScreenY = e.offsetY;

    eraserTrailPoints.value = [toScene(e.offsetX, e.offsetY)];
    canvasRef.value?.setPointerCapture(e.pointerId);
  });

  useEventListener(canvasRef, "pointermove", (e: PointerEvent) => {
    if (!isErasing) return;

    const scene = toScene(e.offsetX, e.offsetY);
    const trail = [...eraserTrailPoints.value, scene];
    if (trail.length > MAX_TRAIL_POINTS) {
      trail.splice(0, trail.length - MAX_TRAIL_POINTS);
    }
    eraserTrailPoints.value = trail;

    if (trail.length < 2) return;

    const segStart = trail.at(-2)!;
    const segEnd = trail.at(-1)!;
    const pathSegment = lineSegment<GlobalPoint>(segStart, segEnd);

    isRestoreMode.value = e.altKey;
    updatePendingIds(pathSegment, e.altKey);
    markInteractiveDirty();
  });

  useEventListener(canvasRef, "pointerup", (e: PointerEvent) => {
    if (!isErasing) return;

    canvasRef.value?.releasePointerCapture(activePointerId);
    isErasing = false;
    activePointerId = -1;

    const distance = Math.hypot(e.offsetX - startScreenX, e.offsetY - startScreenY);
    const toDelete = distance < CLICK_THRESHOLD ? resolveClickErase(e) : resolveDragErase();

    clearEraserState();

    if (toDelete.length > 0) {
      recordAction(() => onDelete(toDelete));
    }

    markStaticDirty();
    markInteractiveDirty();
  });

  function cancelEraserIfActive(): void {
    if (!isErasing) return;
    if (activePointerId >= 0) {
      canvasRef.value?.releasePointerCapture(activePointerId);
    }
    isErasing = false;
    activePointerId = -1;
    clearEraserState();
    markInteractiveDirty();
  }

  return {
    pendingErasureIds,
    eraserTrailPoints,
    isRestoreMode,
    cancelEraserIfActive,
  };
}
