import { shallowRef, triggerRef } from "vue";
import type { Ref, ShallowRef } from "vue";
import { useEventListener } from "@vueuse/core";
import { useKeyboardShortcuts } from "../../../shared/useKeyboardShortcuts";
import type { ExcalidrawElement, ExcalidrawLinearElement, ElementsMap } from "../../elements/types";
import { isArrowElement, isLinearElement } from "../../elements/types";
import type { ExcalidrawImageElement } from "../../image/types";
import { isInitializedImageElement } from "../../image/types";
import { mutateElement } from "../../elements/mutateElement";
import type { Box, GlobalPoint } from "../../../shared/math";
import type { ToolType } from "../../tools/types";
import {
  updateBoundArrowEndpoints,
  updateArrowBindings,
  unbindArrow,
  unbindArrowEndpoint,
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
import {
  hitTestMidpoints,
  insertPointAtSegment,
  movePoint,
  getSizeFromPoints,
} from "../../linear-editor/pointHandles";

type InteractionState =
  | { type: "idle" }
  | { type: "dragging"; dragState: DragState }
  | { type: "resizing"; resizeState: ResizeState }
  | { type: "rotating" }
  | { type: "boxSelecting"; startPoint: GlobalPoint }
  | {
      type: "midpointDragging";
      element: ExcalidrawLinearElement;
      pointIndex: number;
      lastScene: GlobalPoint;
    };

interface UseSelectionInteractionReturn {
  selectionBox: ShallowRef<Box | null>;
  cursorStyle: ShallowRef<string>;
  hoveredMidpoint: ShallowRef<{ elementId: string; segmentIndex: number } | null>;
  hoveredElement: ShallowRef<ExcalidrawElement | null>;
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
  /** When set, selection interaction defers to the crop editor */
  croppingElementId?: ShallowRef<string | null>;
  /** Called when user double-clicks a linear element (arrow or line) */
  onDoubleClickLinear?: (element: ExcalidrawLinearElement) => void;
  /** Called when user double-clicks an initialized image element */
  onDoubleClickImage?: (element: ExcalidrawImageElement) => void;
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
  /** Called on idle pointer-move to check embeddable hover. Returns cursor override or null. */
  onEmbeddableHover?: (scenePoint: GlobalPoint, event: PointerEvent) => string | null;
  /** Called on short-click pointer-up. Returns true if handled (skip drag finalization). */
  onEmbeddableClick?: (
    scenePoint: GlobalPoint,
    event: PointerEvent,
    clickDuration: number,
  ) => boolean;
  /** Called on Escape key (before clearSelection). */
  onEscape?: () => void;
  /** Called at the start of every pointer-down. */
  onCanvasPointerDown?: () => void;
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
    croppingElementId,
    onDoubleClickLinear,
    onDoubleClickImage,
    elementMap,
    onContainerChanged,
    onInteractionStart,
    onInteractionEnd,
    recordAction,
    expandSelectionForGroups,
    onGroupAction,
    onUngroupAction,
    onDeleteCleanup,
    onEmbeddableHover,
    onEmbeddableClick,
    onEscape,
    onCanvasPointerDown,
  } = options;

  let interaction: InteractionState = { type: "idle" };
  let pointerDownTimestamp = 0;

  const selectionBox = options.selectionBox ?? shallowRef<Box | null>(null);
  const cursorStyle = shallowRef("default");
  const hoveredMidpoint = shallowRef<{ elementId: string; segmentIndex: number } | null>(null);
  const hoveredElement = shallowRef<ExcalidrawElement | null>(null);

  function tryStartMidpointDrag(scenePoint: GlobalPoint, e: PointerEvent): boolean {
    const selected = selectedElements();
    for (const el of selected) {
      if (!isLinearElement(el) || el.points.length !== 2) continue;
      const midIdx = hitTestMidpoints(scenePoint, el, zoom.value);
      if (midIdx < 0) continue;

      onInteractionStart?.();

      const result = insertPointAtSegment(el.points, midIdx);
      const dims = getSizeFromPoints(result.points);
      mutateElement(el, {
        points: result.points,
        width: dims.width,
        height: dims.height,
      });

      interaction = {
        type: "midpointDragging",
        element: el,
        pointIndex: result.insertedIndex,
        lastScene: scenePoint,
      };
      hoveredMidpoint.value = null;
      canvasRef.value?.setPointerCapture(e.pointerId);
      markStaticDirty();
      markInteractiveDirty();
      return true;
    }
    return false;
  }

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
    return (
      activeTool.value !== "selection" ||
      !!editingLinearElement?.value ||
      !!croppingElementId?.value
    );
  }

  function shouldIgnorePointerDown(e: PointerEvent): boolean {
    return spaceHeld.value || isPanning.value || isSelectionBlocked() || e.button !== 0;
  }

  function tryStartInteraction(scenePoint: GlobalPoint, e: PointerEvent): boolean {
    return (
      tryStartRotation(scenePoint, e) ||
      tryStartResize(scenePoint, e) ||
      tryStartMidpointDrag(scenePoint, e) ||
      tryStartDrag(scenePoint, e)
    );
  }

  function startBoxSelection(scenePoint: GlobalPoint, e: PointerEvent): void {
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

  function handlePointerDown(e: PointerEvent): void {
    if (shouldIgnorePointerDown(e)) return;

    pointerDownTimestamp = Date.now();
    onCanvasPointerDown?.();
    hoveredElement.value = null;

    const scenePoint = toScene(e.offsetX, e.offsetY);

    if (tryStartInteraction(scenePoint, e)) return;

    startBoxSelection(scenePoint, e);
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
    // Trigger ShallowRef so Vue overlays (e.g. EmbeddableOverlay) recompute positions
    triggerRef(elements);
  }

  function getSingleSelected(): ExcalidrawElement | null {
    const selected = selectedElements();
    if (selected.length !== 1) return null;
    return selected[0] ?? null;
  }

  function handleDragging(scenePoint: GlobalPoint, state: DragState): void {
    continueDrag(scenePoint, state, selectedElements());
    updateBoundElementsForSelected();
    markSceneDirty();
  }

  function handleResizing(
    scenePoint: GlobalPoint,
    resizeState: ResizeState,
    shiftKey: boolean,
  ): void {
    const el = getSingleSelected();
    if (!el) return;
    resizeElement(scenePoint, resizeState, el, shiftKey);
    updateBoundElementsForSelected();
    markSceneDirty();
  }

  function handleRotating(scenePoint: GlobalPoint, shiftKey: boolean): void {
    const el = getSingleSelected();
    if (!el) return;
    rotateElement(scenePoint, el, shiftKey);
    updateBoundElementsForSelected();
    markSceneDirty();
  }

  function handleMidpointDragging(
    scenePoint: GlobalPoint,
    state: InteractionState & { type: "midpointDragging" },
  ): void {
    const dx = scenePoint[0] - state.lastScene[0];
    const dy = scenePoint[1] - state.lastScene[1];
    state.lastScene = scenePoint;

    const el = state.element;
    const result = movePoint(el.x, el.y, el.points, state.pointIndex, dx, dy);
    const dims = getSizeFromPoints(result.points);
    mutateElement(el, {
      x: result.x,
      y: result.y,
      points: result.points,
      width: dims.width,
      height: dims.height,
    });

    // Re-snap bound endpoints so arrow stays connected to shapes
    if (isArrowElement(el)) {
      updateArrowBindings(el, elements.value);
    }

    markSceneDirty();
  }

  function handleBoxSelecting(
    scenePoint: GlobalPoint,
    state: InteractionState & { type: "boxSelecting" },
  ): void {
    const box = normalizeBox(state.startPoint, scenePoint);
    selectionBox.value = box;
    selectElementsInBox(box);
    markInteractiveDirty();
  }

  function handlePointerMove(e: PointerEvent): void {
    const scenePoint = toScene(e.offsetX, e.offsetY);

    if (interaction.type === "idle") {
      updateCursor(scenePoint, e);
      return;
    }

    if (interaction.type === "dragging") {
      handleDragging(scenePoint, interaction.dragState);
      return;
    }

    if (interaction.type === "resizing") {
      handleResizing(scenePoint, interaction.resizeState, e.shiftKey);
      return;
    }

    if (interaction.type === "rotating") {
      handleRotating(scenePoint, e.shiftKey);
      return;
    }

    if (interaction.type === "midpointDragging") {
      handleMidpointDragging(scenePoint, interaction);
      return;
    }

    if (interaction.type === "boxSelecting") {
      handleBoxSelecting(scenePoint, interaction);
    }
  }

  /**
   * After dragging, unbind arrow endpoints whose target shape was NOT
   * part of the drag (i.e. the arrow was dragged away independently).
   * If both the arrow and its bound shape were dragged together,
   * the binding stays intact (Excalidraw's "simultaneouslyUpdated" pattern).
   */
  function unbindDraggedArrows(): void {
    const draggedIds = new Set(selectedElements().map((el) => el.id));
    for (const el of selectedElements()) {
      if (!isArrowElement(el)) continue;

      if (el.startBinding && !draggedIds.has(el.startBinding.elementId)) {
        unbindArrowEndpoint(el, "start", elements.value);
      }
      if (el.endBinding && !draggedIds.has(el.endBinding.elementId)) {
        unbindArrowEndpoint(el, "end", elements.value);
      }
    }
  }

  function tryActivateEmbeddable(e: PointerEvent): boolean {
    if (!onEmbeddableClick) return false;
    const clickDuration = Date.now() - pointerDownTimestamp;
    const scenePoint = toScene(e.offsetX, e.offsetY);
    return onEmbeddableClick(scenePoint, e, clickDuration);
  }

  function finalizeDrag(e: PointerEvent): void {
    if (tryActivateEmbeddable(e)) {
      onInteractionEnd?.();
      return;
    }
    unbindDraggedArrows();
    onInteractionEnd?.();
    markSceneDirty();
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
      finalizeDrag(e);
      return;
    }

    if (prevInteraction.type === "midpointDragging") {
      onInteractionEnd?.();
      markSceneDirty();
      return;
    }

    if (prevInteraction.type === "resizing" || prevInteraction.type === "rotating") {
      onInteractionEnd?.();
      markSceneDirty();
    }
  }

  function getCursorForTransformHandle(
    scenePoint: GlobalPoint,
    selected: readonly ExcalidrawElement[],
  ): string | null {
    for (const el of selected) {
      const handleType = getTransformHandleAtPosition(scenePoint, el, zoom.value);
      if (handleType) return getResizeCursor(handleType);
    }
    return null;
  }

  function getCursorForMidpoint(
    scenePoint: GlobalPoint,
    selected: readonly ExcalidrawElement[],
  ): string | null {
    for (const el of selected) {
      if (!isLinearElement(el) || el.points.length !== 2) continue;
      const midIdx = hitTestMidpoints(scenePoint, el, zoom.value);
      if (midIdx >= 0) {
        hoveredMidpoint.value = { elementId: el.id, segmentIndex: midIdx };
        markInteractiveDirty();
        return "pointer";
      }
    }
    return null;
  }

  function isHoveringSelected(
    scenePoint: GlobalPoint,
    selected: readonly ExcalidrawElement[],
  ): boolean {
    return selected.some((el) => hitTest(scenePoint, el, zoom.value));
  }

  function updateCursor(scenePoint: GlobalPoint, event?: PointerEvent): void {
    if (activeTool.value !== "selection") {
      hoveredElement.value = null;
      return;
    }

    const selected = selectedElements();

    // Track hovered element for link badge
    hoveredElement.value = getElementAtPosition(scenePoint, elements.value, zoom.value);

    const transformCursor = getCursorForTransformHandle(scenePoint, selected);
    if (transformCursor) {
      hoveredMidpoint.value = null;
      cursorStyle.value = transformCursor;
      return;
    }

    const midpointCursor = getCursorForMidpoint(scenePoint, selected);
    if (midpointCursor) {
      cursorStyle.value = midpointCursor;
      return;
    }

    if (hoveredMidpoint.value) {
      hoveredMidpoint.value = null;
      markInteractiveDirty();
    }

    // Embeddable center-third hover detection
    if (event && onEmbeddableHover) {
      const embeddableCursor = onEmbeddableHover(scenePoint, event);
      if (embeddableCursor) {
        cursorStyle.value = embeddableCursor;
        return;
      }
    }

    cursorStyle.value = isHoveringSelected(scenePoint, selected) ? "move" : "default";
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

    const scenePoint = toScene(e.offsetX, e.offsetY);
    const hitElement = getElementAtPosition(scenePoint, elements.value, zoom.value);
    if (!hitElement) return;

    // Image crop: double-click an initialized image to enter crop mode
    if (isInitializedImageElement(hitElement) && onDoubleClickImage) {
      onDoubleClickImage(hitElement);
      return;
    }

    // Linear editor: double-click a linear element to enter point editing
    if (isLinearElement(hitElement) && onDoubleClickLinear) {
      onDoubleClickLinear(hitElement);
    }
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
      onEscape?.();
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
    hoveredMidpoint,
    hoveredElement,
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
