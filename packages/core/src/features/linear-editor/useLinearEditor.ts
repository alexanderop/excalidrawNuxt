import { shallowRef, triggerRef } from "vue";
import type { Ref, ShallowRef } from "vue";
import { useEventListener } from "@vueuse/core";
import { useKeyboardShortcuts } from "../../shared/useKeyboardShortcuts";
import type {
  ExcalidrawElement,
  ExcalidrawArrowElement,
  ExcalidrawLinearElement,
} from "../elements/types";
import { isArrowElement } from "../elements/types";
import { mutateElement } from "../elements/mutateElement";
import type { GlobalPoint } from "../../shared/math";
import {
  getHoveredElementForBinding,
  bindArrowToElement,
  unbindArrowEndpoint,
  updateArrowEndpoint,
} from "../binding";
import {
  hitTestPointHandles,
  hitTestMidpoints,
  insertPointAtSegment,
  removePoints,
  movePoints,
  getSizeFromPoints,
} from "./pointHandles";

const _excludeIds = new Set<string>();

function commitEndpointBinding(
  el: ExcalidrawArrowElement,
  endpoint: "start" | "end",
  scene: GlobalPoint,
  allElements: readonly ExcalidrawElement[],
  zoomValue: number,
  excludeIds: ReadonlySet<string>,
): void {
  const binding = endpoint === "start" ? el.startBinding : el.endBinding;
  if (binding) unbindArrowEndpoint(el, endpoint, allElements);

  const candidate = getHoveredElementForBinding(scene, allElements, zoomValue, excludeIds);
  if (!candidate) return;

  bindArrowToElement(el, endpoint, candidate.element, candidate.fixedPoint);
  updateArrowEndpoint(el, endpoint, candidate.element);
}

interface UseLinearEditorOptions {
  canvasRef: Readonly<Ref<HTMLCanvasElement | null>>;
  zoom: Ref<number>;
  toScene: (screenX: number, screenY: number) => GlobalPoint;
  markStaticDirty: () => void;
  markInteractiveDirty: () => void;
  select: (id: string) => void;
  elements: ShallowRef<readonly ExcalidrawElement[]>;
  suggestedBindings: ShallowRef<readonly ExcalidrawElement[]>;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
}

interface UseLinearEditorReturn {
  editingElement: ShallowRef<ExcalidrawLinearElement | null>;
  selectedPointIndices: ShallowRef<ReadonlySet<number>>;
  hoveredMidpointIndex: ShallowRef<number | null>;
  enterEditor: (element: ExcalidrawLinearElement) => void;
  exitEditor: () => void;
}

type EditorInteraction = { type: "idle" } | { type: "dragging"; lastScene: GlobalPoint };

function togglePointInSet(set: Set<number>, idx: number): void {
  if (set.has(idx)) {
    set.delete(idx);
    return;
  }
  set.add(idx);
}

export function useLinearEditor(options: UseLinearEditorOptions): UseLinearEditorReturn {
  const {
    canvasRef,
    zoom,
    toScene,
    markStaticDirty,
    markInteractiveDirty,
    select,
    elements,
    suggestedBindings,
  } = options;

  const editingElement = shallowRef<ExcalidrawLinearElement | null>(null);
  const selectedPointIndices = shallowRef<ReadonlySet<number>>(new Set());
  const hoveredMidpointIndex = shallowRef<number | null>(null);

  let interaction: EditorInteraction = { type: "idle" };

  function resetEditorState(): void {
    selectedPointIndices.value = new Set();
    hoveredMidpointIndex.value = null;
    interaction = { type: "idle" };
  }

  function enterEditor(element: ExcalidrawLinearElement): void {
    editingElement.value = element;
    resetEditorState();
    select(element.id);
    markInteractiveDirty();
  }

  function exitEditor(): void {
    editingElement.value = null;
    resetEditorState();
    markInteractiveDirty();
  }

  function applyPointMutation(
    el: ExcalidrawLinearElement,
    indices: ReadonlySet<number>,
    dx: number,
    dy: number,
  ): void {
    const result = movePoints(el.x, el.y, el.points, indices, dx, dy);
    const dims = getSizeFromPoints(result.points);

    mutateElement(el, {
      x: result.x,
      y: result.y,
      points: result.points,
      width: dims.width,
      height: dims.height,
    });

    triggerRef(editingElement);
    markStaticDirty();
    markInteractiveDirty();
  }

  useEventListener(canvasRef, "pointerdown", (e: PointerEvent) => {
    const el = editingElement.value;
    if (!el) return;
    if (e.button !== 0) return;

    const scene = toScene(e.offsetX, e.offsetY);

    // Check point handle hit
    const pointIdx = hitTestPointHandles(scene, el, zoom.value);
    if (pointIdx >= 0) {
      options.onInteractionStart?.();
      handlePointClick(pointIdx, e);
      interaction = { type: "dragging", lastScene: scene };
      canvasRef.value?.setPointerCapture(e.pointerId);
      return;
    }

    // Check midpoint hit — insert and start dragging
    const midIdx = hitTestMidpoints(scene, el, zoom.value);
    if (midIdx >= 0) {
      options.onInteractionStart?.();
      handleMidpointClick(el, midIdx, e);
      return;
    }

    // Clicked empty space → exit editor
    exitEditor();
  });

  function handlePointClick(pointIdx: number, e: PointerEvent): void {
    if (e.shiftKey) {
      const next = new Set(selectedPointIndices.value);
      togglePointInSet(next, pointIdx);
      selectedPointIndices.value = next;
      markInteractiveDirty();
      return;
    }

    if (!selectedPointIndices.value.has(pointIdx)) {
      selectedPointIndices.value = new Set([pointIdx]);
    }
    markInteractiveDirty();
  }

  function handleMidpointClick(el: ExcalidrawLinearElement, midIdx: number, e: PointerEvent): void {
    const result = insertPointAtSegment(el.points, midIdx);
    const dims = getSizeFromPoints(result.points);

    mutateElement(el, {
      points: result.points,
      width: dims.width,
      height: dims.height,
    });

    triggerRef(editingElement);

    selectedPointIndices.value = new Set([result.insertedIndex]);
    hoveredMidpointIndex.value = null;
    interaction = { type: "dragging", lastScene: toScene(e.offsetX, e.offsetY) };
    canvasRef.value?.setPointerCapture(e.pointerId);
    markStaticDirty();
    markInteractiveDirty();
  }

  useEventListener(canvasRef, "pointermove", (e: PointerEvent) => {
    const el = editingElement.value;
    if (!el) return;

    const scene = toScene(e.offsetX, e.offsetY);

    if (interaction.type === "dragging") {
      const dx = scene[0] - interaction.lastScene[0];
      const dy = scene[1] - interaction.lastScene[1];
      interaction.lastScene = scene;

      if (selectedPointIndices.value.size > 0) {
        applyPointMutation(el, selectedPointIndices.value, dx, dy);

        // Show binding highlight when dragging an endpoint (arrows only — lines don't bind)
        if (isArrowElement(el)) {
          const indices = selectedPointIndices.value;
          const isEndpoint = indices.has(0) || indices.has(el.points.length - 1);
          if (isEndpoint) {
            _excludeIds.clear();
            _excludeIds.add(el.id);
            const candidate = getHoveredElementForBinding(
              scene,
              elements.value,
              zoom.value,
              _excludeIds,
            );
            suggestedBindings.value = candidate ? [candidate.element] : [];
          }
        }
      }
      return;
    }

    // Update midpoint hover state
    const midIdx = hitTestMidpoints(scene, el, zoom.value);
    const newHovered = midIdx >= 0 ? midIdx : null;
    if (newHovered !== hoveredMidpointIndex.value) {
      hoveredMidpointIndex.value = newHovered;
      markInteractiveDirty();
    }
  });

  useEventListener(canvasRef, "pointerup", (e: PointerEvent) => {
    const el = editingElement.value;
    if (!el) return;
    if (interaction.type !== "dragging") return;

    canvasRef.value?.releasePointerCapture(e.pointerId);

    // Commit bindings for dragged endpoints (arrows only — lines don't bind)
    if (isArrowElement(el)) {
      const indices = selectedPointIndices.value;
      const scene = toScene(e.offsetX, e.offsetY);
      _excludeIds.clear();
      _excludeIds.add(el.id);

      if (indices.has(0)) {
        commitEndpointBinding(el, "start", scene, elements.value, zoom.value, _excludeIds);
      }

      if (indices.has(el.points.length - 1)) {
        commitEndpointBinding(el, "end", scene, elements.value, zoom.value, _excludeIds);
      }

      suggestedBindings.value = [];
    }
    options.onInteractionEnd?.();
    interaction = { type: "idle" };
    markStaticDirty();
    markInteractiveDirty();
  });

  function deleteSelectedPoints(): void {
    const el = editingElement.value;
    if (!el) return;
    if (selectedPointIndices.value.size === 0) return;
    const newPoints = removePoints(el.points, selectedPointIndices.value);
    if (!newPoints) return;
    const dims = getSizeFromPoints(newPoints);
    mutateElement(el, { points: newPoints, width: dims.width, height: dims.height });
    triggerRef(editingElement);
    selectedPointIndices.value = new Set();
    markStaticDirty();
    markInteractiveDirty();
  }

  function exitIfActive(): void {
    if (!editingElement.value) return;
    exitEditor();
  }

  useKeyboardShortcuts({
    escape: exitIfActive,
    delete: deleteSelectedPoints,
    backspace: deleteSelectedPoints,
  });

  return {
    editingElement,
    selectedPointIndices,
    hoveredMidpointIndex,
    enterEditor,
    exitEditor,
  };
}
