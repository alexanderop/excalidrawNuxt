import { shallowRef } from "vue";
import type { Ref, ShallowRef } from "vue";
import { useEventListener } from "@vueuse/core";
import { useKeyboardShortcuts } from "../../../shared/useKeyboardShortcuts";
import type { ExcalidrawElement, ExcalidrawLinearElement, ElementsMap } from "../../elements/types";
import { isArrowElement, isLinearElement } from "../../elements/types";
import { mutateElement } from "../../elements/mutateElement";
import type { Box, GlobalPoint } from "../../../shared/math";
import type { ToolType } from "../../tools/types";
import {
  updateBoundArrowEndpoints,
  unbindArrow,
  unbindAllArrowsFromShape,
  deleteBoundTextForContainer,
} from "../../binding";
import { tryCatchSync } from "../../../utils/tryCatch";
import { hitTest, getElementAtPosition } from "../hitTest";
import { getTransformHandleAtPosition } from "../transformHandles";
import type { TransformHandleType, TransformHandleDirection } from "../transformHandles";
import { startDrag, continueDrag } from "../dragElements";
import type { DragState } from "../dragElements";
import { resizeElement } from "../resizeElement";
import type { ResizeState } from "../resizeElement";
import { rotateElement } from "../rotateElement";
import { getElementBounds } from "../bounds";
import type { Bounds } from "../bounds";

type InteractionState =
  | { type: "idle" }
  | { type: "dragging"; dragState: DragState }
  | { type: "resizing"; resizeState: ResizeState }
  | { type: "rotating" }
  | { type: "boxSelecting"; startPoint: GlobalPoint };

interface UseSelectionInteractionReturn {
  selectionBox: ShallowRef<Box | null>;
  cursorStyle: ShallowRef<string>;
}

interface UseSelectionInteractionOptions {
  canvasRef: Readonly<Ref<HTMLCanvasElement | null>>;
  activeTool: ShallowRef<ToolType>;
  spaceHeld: Ref<boolean>;
  isPanning: Ref<boolean>;
  zoom: Ref<number>;
  toScene: (screenX: number, screenY: number) => GlobalPoint;
  elements: ShallowRef<readonly ExcalidrawElement[]>;
  selectedElements: () => readonly ExcalidrawElement[];
  select: (id: string) => void;
  toggleSelection: (id: string) => void;
  clearSelection: (this: void) => void;
  replaceSelection: (ids: Set<string>) => void;
  selectAll: (this: void) => void;
  isSelected: (id: string) => boolean;
  markStaticDirty: () => void;
  markInteractiveDirty: () => void;
  setTool: (tool: ToolType) => void;
  selectionBox?: ShallowRef<Box | null>;
  /** When set, selection interaction defers to the linear editor */
  editingLinearElement?: ShallowRef<ExcalidrawLinearElement | null>;
  /** Called when user double-clicks a linear element (arrow or line) */
  onDoubleClickLinear?: (element: ExcalidrawLinearElement) => void;
  expandSelectionForGroups?: () => void;
  onGroupAction?: () => void;
  onUngroupAction?: () => void;
  onDeleteCleanup?: (deletedIds: ReadonlySet<string>) => void;
  /** ElementsMap for bound text lookups */
  elementMap?: ElementsMap;
  /** Called after drag/resize on containers that have bound text */
  onContainerChanged?: (container: ExcalidrawElement) => void;
  /** Called when a drag/resize/rotate interaction starts (for undo checkpoints) */
  onInteractionStart?: () => void;
  /** Called when a drag/resize/rotate interaction ends (for undo checkpoints) */
  onInteractionEnd?: () => void;
  /** Wraps a mutation for history recording (undo/redo). Falls back to direct call if not provided. */
  recordAction?: (fn: () => void) => void;
}

export function useSelectionInteraction(
  options: UseSelectionInteractionOptions,
): UseSelectionInteractionReturn {
  const {
    canvasRef,
    activeTool,
    spaceHeld,
    isPanning,
    zoom,
    toScene,
    elements,
    selectedElements,
    select,
    toggleSelection,
    clearSelection,
    replaceSelection,
    selectAll,
    isSelected,
    markStaticDirty,
    markInteractiveDirty,
    setTool,
    editingLinearElement,
    onDoubleClickLinear,
    elementMap,
    onContainerChanged,
    onInteractionStart,
    onInteractionEnd,
    recordAction,
    expandSelectionForGroups,
    onGroupAction,
    onUngroupAction,
    onDeleteCleanup,
  } = options;

  let interaction: InteractionState = { type: "idle" };

  const selectionBox = options.selectionBox ?? shallowRef<Box | null>(null);
  const cursorStyle = shallowRef("default");

  function tryStartResize(scenePoint: GlobalPoint, e: PointerEvent): boolean {
    const selected = selectedElements();
    if (selected.length !== 1) return false;

    const el = selected[0];
    if (!el) return false;
    const handleType = getTransformHandleAtPosition(scenePoint, el, zoom.value);
    if (!handleType || handleType === "rotation") return false;

    onInteractionStart?.();
    interaction = {
      type: "resizing",
      resizeState: {
        handleType: handleType satisfies TransformHandleDirection,
        originalBounds: { x: el.x, y: el.y, width: el.width, height: el.height },
        origin: scenePoint,
      },
    };
    canvasRef.value?.setPointerCapture(e.pointerId);
    return true;
  }

  function tryStartRotation(scenePoint: GlobalPoint, e: PointerEvent): boolean {
    const selected = selectedElements();
    if (selected.length !== 1) return false;

    const el = selected[0];
    if (!el) return false;
    const handleType = getTransformHandleAtPosition(scenePoint, el, zoom.value);
    if (handleType !== "rotation") return false;

    onInteractionStart?.();
    interaction = { type: "rotating" };
    cursorStyle.value = "grabbing";
    tryCatchSync(() => canvasRef.value?.setPointerCapture(e.pointerId));
    return true;
  }

  function tryStartDrag(scenePoint: GlobalPoint, e: PointerEvent): boolean {
    const hitElement = getElementAtPosition(scenePoint, elements.value, zoom.value);
    if (!hitElement) return false;

    if (e.shiftKey) {
      toggleSelection(hitElement.id);
    }
    if (!e.shiftKey && !isSelected(hitElement.id)) {
      select(hitElement.id);
    }
    expandSelectionForGroups?.();

    onInteractionStart?.();
    interaction = {
      type: "dragging",
      dragState: startDrag(scenePoint, selectedElements()),
    };
    canvasRef.value?.setPointerCapture(e.pointerId);
    markInteractiveDirty();
    return true;
  }

  function isSelectionBlocked(): boolean {
    return activeTool.value !== "selection" || !!editingLinearElement?.value;
  }

  function handlePointerDown(e: PointerEvent): void {
    if (spaceHeld.value || isPanning.value) return;
    if (isSelectionBlocked()) return;
    if (e.button !== 0) return;

    const scenePoint = toScene(e.offsetX, e.offsetY);

    if (tryStartRotation(scenePoint, e)) return;
    if (tryStartResize(scenePoint, e)) return;
    if (tryStartDrag(scenePoint, e)) return;

    // Clicked empty space → start box selecting
    if (!e.shiftKey) {
      clearSelection();
    }
    interaction = {
      type: "boxSelecting",
      startPoint: scenePoint,
    };
    canvasRef.value?.setPointerCapture(e.pointerId);
    markInteractiveDirty();
  }

  function updateBoundElementsForSelected(): void {
    for (const el of selectedElements()) {
      if (isArrowElement(el)) continue;
      const bound = el.boundElements ?? [];
      if (bound.length === 0) continue;
      updateBoundArrowEndpoints(el, elements.value);
      if (onContainerChanged && bound.some((be) => be.type === "text")) {
        onContainerChanged(el);
      }
    }
  }

  function markSceneDirty(): void {
    markStaticDirty();
    markInteractiveDirty();
  }

  function handlePointerMove(e: PointerEvent): void {
    const scenePoint = toScene(e.offsetX, e.offsetY);

    if (interaction.type === "idle") {
      updateCursor(scenePoint);
      return;
    }

    if (interaction.type === "dragging") {
      continueDrag(scenePoint, interaction.dragState, selectedElements());
      updateBoundElementsForSelected();
      markSceneDirty();
      return;
    }

    if (interaction.type === "resizing") {
      const selected = selectedElements();
      if (selected.length !== 1) return;
      const el = selected[0];
      if (!el) return;
      resizeElement(scenePoint, interaction.resizeState, el, e.shiftKey);
      updateBoundElementsForSelected();
      markSceneDirty();
      return;
    }

    if (interaction.type === "rotating") {
      const selected = selectedElements();
      if (selected.length !== 1) return;
      const el = selected[0];
      if (!el) return;
      rotateElement(scenePoint, el, e.shiftKey);
      updateBoundElementsForSelected();
      markSceneDirty();
      return;
    }

    // interaction.type === 'boxSelecting'
    if (interaction.type !== "boxSelecting") return;
    const box = normalizeBox(interaction.startPoint, scenePoint);
    selectionBox.value = box;
    selectElementsInBox(box);
    markInteractiveDirty();
  }

  function unbindDraggedArrows(): void {
    for (const el of selectedElements()) {
      if (isArrowElement(el) && (el.startBinding || el.endBinding)) {
        unbindArrow(el, elements.value);
      }
    }
  }

  function handlePointerUp(e: PointerEvent): void {
    canvasRef.value?.releasePointerCapture(e.pointerId);
    const prevInteraction = interaction;
    interaction = { type: "idle" };

    if (prevInteraction.type === "boxSelecting") {
      selectionBox.value = null;
      markInteractiveDirty();
      return;
    }

    if (prevInteraction.type === "dragging") {
      unbindDraggedArrows();
      onInteractionEnd?.();
      markSceneDirty();
      return;
    }

    if (prevInteraction.type === "resizing" || prevInteraction.type === "rotating") {
      onInteractionEnd?.();
      markSceneDirty();
    }
  }

  function updateCursor(scenePoint: GlobalPoint): void {
    if (activeTool.value !== "selection") return;

    const selected = selectedElements();

    // Check transform handles
    for (const el of selected) {
      const handleType = getTransformHandleAtPosition(scenePoint, el, zoom.value);
      if (handleType) {
        cursorStyle.value = getResizeCursor(handleType);
        return;
      }
    }

    // Check selected element hover → move cursor
    for (const el of selected) {
      if (hitTest(scenePoint, el, zoom.value)) {
        cursorStyle.value = "move";
        return;
      }
    }

    cursorStyle.value = "default";
  }

  function selectElementsInBox(box: Box): void {
    const boxBounds: Bounds = [box.x, box.y, box.x + box.width, box.y + box.height];
    const ids = new Set<string>();

    for (const el of elements.value) {
      if (!isBoxSelectable(el)) continue;
      const [ex1, ey1, ex2, ey2] = getElementBounds(el);
      if (isFullyEnclosed(ex1, ey1, ex2, ey2, boxBounds)) ids.add(el.id);
    }

    replaceSelection(ids);
    expandSelectionForGroups?.();
  }

  function unbindBeforeDelete(selected: readonly ExcalidrawElement[]): void {
    for (const el of selected) {
      if (isArrowElement(el)) {
        unbindArrow(el, elements.value);
        continue;
      }
      if ((el.boundElements ?? []).length > 0) {
        unbindAllArrowsFromShape(el, elements.value);
      }
    }
  }

  function handleDelete(selected: readonly ExcalidrawElement[]): void {
    unbindBeforeDelete(selected);

    // Delete bound text for containers being deleted
    if (elementMap) {
      for (const el of selected) {
        if (!isArrowElement(el)) {
          deleteBoundTextForContainer(el, elementMap);
        }
      }
    }

    for (const el of selected) {
      mutateElement(el, { isDeleted: true });
    }
    const deletedIds = new Set(selected.map((el) => el.id));
    onDeleteCleanup?.(deletedIds);
    clearSelection();
    markSceneDirty();
  }

  function nudgeSelected(dx: number, dy: number): void {
    const selected = selectedElements();
    if (selected.length === 0) return;
    for (const el of selected) {
      mutateElement(el, { x: el.x + dx, y: el.y + dy });
    }
    updateBoundElementsForSelected();
    markSceneDirty();
  }

  useEventListener(canvasRef, "pointerdown", handlePointerDown);
  useEventListener(canvasRef, "pointermove", handlePointerMove);
  useEventListener(canvasRef, "pointerup", handlePointerUp);

  useEventListener(canvasRef, "dblclick", (e: MouseEvent) => {
    if (activeTool.value !== "selection") return;
    if (!onDoubleClickLinear) return;

    const scenePoint = toScene(e.offsetX, e.offsetY);
    const hitElement = getElementAtPosition(scenePoint, elements.value, zoom.value);
    if (!hitElement || !isLinearElement(hitElement)) return;

    onDoubleClickLinear(hitElement);
  });

  function whenSelectionActive(fn: () => void): () => void {
    return () => {
      if (isSelectionBlocked()) return;
      fn();
    };
  }

  const deleteSelected = whenSelectionActive(() => {
    const fn = () => handleDelete(selectedElements());
    if (recordAction) {
      recordAction(fn);
      return;
    }
    fn();
  });

  useKeyboardShortcuts({
    delete: deleteSelected,
    backspace: deleteSelected,
    escape: whenSelectionActive(() => {
      clearSelection();
      setTool("selection");
      markInteractiveDirty();
    }),
    meta_a: whenSelectionActive(() => {
      selectAll();
      markInteractiveDirty();
    }),
    meta_g: whenSelectionActive(() => onGroupAction?.()),
    meta_shift_g: whenSelectionActive(() => onUngroupAction?.()),
    arrowup: whenSelectionActive(() => nudgeSelected(0, -1)),
    arrowdown: whenSelectionActive(() => nudgeSelected(0, 1)),
    arrowleft: whenSelectionActive(() => nudgeSelected(-1, 0)),
    arrowright: whenSelectionActive(() => nudgeSelected(1, 0)),
    shift_arrowup: whenSelectionActive(() => nudgeSelected(0, -10)),
    shift_arrowdown: whenSelectionActive(() => nudgeSelected(0, 10)),
    shift_arrowleft: whenSelectionActive(() => nudgeSelected(-10, 0)),
    shift_arrowright: whenSelectionActive(() => nudgeSelected(10, 0)),
  });

  return {
    selectionBox,
    cursorStyle,
  };
}

function normalizeBox(start: GlobalPoint, end: GlobalPoint): Box {
  return {
    x: Math.min(start[0], end[0]),
    y: Math.min(start[1], end[1]),
    width: Math.abs(end[0] - start[0]),
    height: Math.abs(end[1] - start[1]),
  };
}

const RESIZE_CURSORS: Record<TransformHandleDirection, string> = {
  n: "ns-resize",
  s: "ns-resize",
  e: "ew-resize",
  w: "ew-resize",
  nw: "nwse-resize",
  se: "nwse-resize",
  ne: "nesw-resize",
  sw: "nesw-resize",
};

function getResizeCursor(handleType: TransformHandleType): string {
  if (handleType === "rotation") return "grab";
  return RESIZE_CURSORS[handleType];
}

function isBoxSelectable(el: ExcalidrawElement): boolean {
  if (el.isDeleted) return false;
  if (el.type === "text" && "containerId" in el && el.containerId) return false;
  return true;
}

function isFullyEnclosed(
  ex1: number,
  ey1: number,
  ex2: number,
  ey2: number,
  boxBounds: Bounds,
): boolean {
  return ex1 >= boxBounds[0] && ey1 >= boxBounds[1] && ex2 <= boxBounds[2] && ey2 <= boxBounds[3];
}
