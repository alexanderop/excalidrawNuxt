<script setup lang="ts">
import { shallowRef, useTemplateRef, computed } from "vue";
import { useElementSize, useEventListener, useActiveElement } from "@vueuse/core";
import { provideDrawVue } from "../context";
import { useViewport } from "../features/canvas/composables/useViewport";
import { useCanvasLayers } from "../features/canvas/composables/useCanvasLayers";
import { useSceneRenderer } from "../features/canvas/composables/useSceneRenderer";
import { usePanning } from "../features/canvas/composables/usePanning";
import { createDirtyFlags } from "../features/canvas/composables/createDirtyFlags";
import { useLayerOrder } from "../features/elements/composables/useLayerOrder";
import { mutateElement } from "../features/elements/mutateElement";
import { isDrawingTool, isFreeDrawTool, isTextTool } from "../features/tools/types";
import { useDrawingInteraction } from "../features/tools/useDrawingInteraction";
import { useFreeDrawInteraction } from "../features/tools/useFreeDrawInteraction";
import { useEraserInteraction } from "../features/tools/useEraserInteraction";
import { useTextInteraction } from "../features/tools/useTextInteraction";
import { useCodeInteraction } from "../features/code/useCodeInteraction";
import { useImageInteraction } from "../features/image/useImageInteraction";
import { useSelection } from "../features/selection/composables/useSelection";
import { useSelectionInteraction } from "../features/selection/composables/useSelectionInteraction";
import { getElementAtPosition } from "../features/selection/hitTest";
import { useMultiPointCreation } from "../features/linear-editor/useMultiPointCreation";
import { useLinearEditor } from "../features/linear-editor/useLinearEditor";
import {
  updateBoundTextAfterContainerChange,
  deleteBoundTextForContainer,
} from "../features/binding/boundText";
import { unbindArrow, unbindAllArrowsFromShape } from "../features/binding/bindUnbind";
import { useGroups } from "../features/groups/composables/useGroups";
import { cleanupAfterDelete } from "../features/groups/groupUtils";
import { useContextMenu } from "../features/context-menu/composables/useContextMenu";
import { useTheme } from "../features/theme/useTheme";
import { useHistory } from "../features/history/useHistory";
import { useKeyboardShortcuts } from "../shared/useKeyboardShortcuts";
import { KEY_TO_TOOL } from "../features/tools/useTool";
import { isTypingElement } from "../shared/isTypingElement";
import type { ActionDefinition } from "../shared/useActionRegistry";
import type { ExcalidrawElement } from "../features/elements/types";
import { isArrowElement } from "../features/elements/types";
import type { ToolType } from "../features/tools/types";

// ── DrawVue context (provide/inject for multi-instance support) ─────
const ctx = provideDrawVue();
const { elements, elementMap, addElement, replaceElements, getElementById } = ctx.elements;
const { activeTool, setTool, onBeforeToolChange } = ctx.tool;
const { register } = ctx.actionRegistry;
const { copy: clipboardCopy, cut: clipboardCut, paste: clipboardPaste } = ctx.clipboard;
const { copyStyles, pasteStyles, hasStoredStyles } = ctx.styleClipboard;

// Template refs
const containerRef = useTemplateRef<HTMLDivElement>("container");
const staticCanvasRef = useTemplateRef<HTMLCanvasElement>("staticCanvas");
const newElementCanvasRef = useTemplateRef<HTMLCanvasElement>("newElementCanvas");
const interactiveCanvasRef = useTemplateRef<HTMLCanvasElement>("interactiveCanvas");
const textEditorContainerRef = useTemplateRef<HTMLDivElement>("textEditorContainer");

// Viewport & size
const { width, height } = useElementSize(containerRef);
const { scrollX, scrollY, zoom, zoomTo, zoomBy, panBy, toScene } = useViewport();

const {
  selectedIds,
  selectedElements,
  select,
  addToSelection,
  toggleSelection,
  clearSelection,
  replaceSelection,
  selectAll,
  isSelected,
} = useSelection(elements);

const showToolProperties = computed(
  () =>
    isDrawingTool(activeTool.value) ||
    isFreeDrawTool(activeTool.value) ||
    isTextTool(activeTool.value),
);

const suggestedBindings = shallowRef<readonly ExcalidrawElement[]>([]);

// Canvas layers (contexts + RoughCanvas init)
const { staticCtx, newElementCtx, interactiveCtx, staticRc, newElementRc } = useCanvasLayers({
  staticCanvasRef,
  newElementCanvasRef,
  interactiveCanvasRef,
});

// Stable deferred dirty callbacks — safe no-ops until bind()
const dirty = createDirtyFlags();

const { selectedGroupIds, groupSelection, ungroupSelection, expandSelectionForGroups } = useGroups({
  elements,
  selectedIds,
  selectedElements: () => selectedElements.value,
  replaceSelection,
  replaceElements,
  markStaticDirty: dirty.markStaticDirty,
  markInteractiveDirty: dirty.markInteractiveDirty,
});

// Layer order
const layerOrder = useLayerOrder({ elements, replaceElements });

// History (undo/redo)
const history = useHistory({
  elements,
  replaceElements,
  selectedIds,
  replaceSelection,
  dirty,
});

function applyLayerAction(action: (ids: ReadonlySet<string>) => void): void {
  action(selectedIds.value);
  dirty.markStaticDirty();
  dirty.markInteractiveDirty();
}

function handleDelete(): void {
  const selected = selectedElements.value;
  if (selected.length === 0) return;
  for (const el of selected) {
    mutateElement(el, { isDeleted: true });
  }
  const deletedIds = new Set(selected.map((el) => el.id));
  cleanupAfterDelete(elements.value, deletedIds);
  clearSelection();
  dirty.markStaticDirty();
  dirty.markInteractiveDirty();
}

// Context menu
const { menuType: contextMenuType, items: contextMenuItems } = useContextMenu(ctx.actionRegistry);

function handleContextMenu(e: MouseEvent): void {
  const scenePoint = toScene(e.offsetX, e.offsetY);
  const hitElement = getElementAtPosition(scenePoint, elements.value, zoom.value);

  if (hitElement) {
    if (!isSelected(hitElement.id)) {
      select(hitElement.id);
      expandSelectionForGroups();
      dirty.markInteractiveDirty();
    }
    contextMenuType.value = "element";
    return;
  }

  clearSelection();
  dirty.markInteractiveDirty();
  contextMenuType.value = "canvas";
}

// Style clipboard keyboard shortcuts (Cmd+Alt+C / Cmd+Alt+V)
const activeEl = useActiveElement();
useEventListener(document, "keydown", (e: KeyboardEvent) => {
  if (isTypingElement(activeEl.value)) return;
  if (!e.metaKey || !e.altKey) return;

  if (e.code === "KeyC") {
    if (selectedElements.value.length === 0) return;
    e.preventDefault();
    copyStyles(selectedElements.value[0]!);
    return;
  }

  if (e.code === "KeyV") {
    if (selectedElements.value.length === 0) return;
    if (!hasStoredStyles.value) return;
    e.preventDefault();
    history.recordAction(() => pasteStyles([...selectedElements.value], dirty.markStaticDirty));
  }
});

// Element clipboard keyboard shortcuts (Cmd+C / Cmd+X / Cmd+V)
useEventListener(document, "keydown", (e: KeyboardEvent) => {
  if (isTypingElement(activeEl.value)) return;
  if (!e.metaKey && !e.ctrlKey) return;
  if (e.altKey) return; // Alt+C/V is style clipboard, not element clipboard

  if (e.code === "KeyC") {
    e.preventDefault();
    handleCopy();
    return;
  }

  if (e.code === "KeyX") {
    e.preventDefault();
    history.recordAction(handleCut);
    return;
  }

  if (e.code === "KeyV") {
    e.preventDefault();
    history.recordAction(handlePaste);
  }
});

// Panning (only needs canvasRef, panBy, zoomBy, activeTool — all available early)
const { panningCursor, spaceHeld, isPanning } = usePanning({
  canvasRef: interactiveCanvasRef,
  panBy,
  zoomBy,
  activeTool,
});

// Theme (stays global)
const { theme, toggleTheme } = useTheme();

// Tool keyboard shortcuts
useKeyboardShortcuts(
  Object.fromEntries(Object.entries(KEY_TO_TOOL).map(([key, tool]) => [key, () => setTool(tool)])),
);

// Shared context threaded into multiple composables
const shared = {
  canvasRef: interactiveCanvasRef,
  toScene,
  zoom,
  elements,
  suggestedBindings,
  markStaticDirty: dirty.markStaticDirty,
  markInteractiveDirty: dirty.markInteractiveDirty,
  onInteractionStart: history.saveCheckpoint,
  onInteractionEnd: history.commitCheckpoint,
};

const { multiElement, lastCursorPoint, startMultiPoint, finalizeMultiPoint } =
  useMultiPointCreation({
    ...shared,
    onFinalize() {
      setTool("selection");
    },
  });

const {
  editingElement: editingLinearElement,
  selectedPointIndices: editingPointIndices,
  hoveredMidpointIndex: editingHoveredMidpoint,
  enterEditor: enterLinearEditor,
  exitEditor: exitLinearEditor,
} = useLinearEditor({
  ...shared,
  select,
});

// Text editing
const { editingTextElement, submitTextEditor } = useTextInteraction({
  canvasRef: interactiveCanvasRef,
  textEditorContainerRef,
  activeTool,
  setTool,
  toScene,
  zoom,
  scrollX,
  scrollY,
  elements,
  elementMap,
  addElement,
  getElementById,
  select,
  markStaticDirty: dirty.markStaticDirty,
  markInteractiveDirty: dirty.markInteractiveDirty,
  spaceHeld,
  isPanning,
  theme,
  onInteractionStart: history.saveCheckpoint,
  onInteractionEnd: history.commitCheckpoint,
});

// Code editing
const { editingCodeElement, submitCodeEditor } = useCodeInteraction({
  canvasRef: interactiveCanvasRef,
  textEditorContainerRef,
  activeTool,
  setTool,
  toScene,
  zoom,
  scrollX,
  scrollY,
  elements,
  addElement,
  select,
  markStaticDirty: dirty.markStaticDirty,
  markInteractiveDirty: dirty.markInteractiveDirty,
  spaceHeld,
  isPanning,
  theme,
  onInteractionStart: history.saveCheckpoint,
  onInteractionEnd: history.commitCheckpoint,
});

// Image insertion (file dialog, drop zone, paste)
useImageInteraction({
  canvasRef: interactiveCanvasRef,
  activeTool,
  setTool,
  toScene,
  zoom,
  width,
  height,
  addElement,
  select,
  markStaticDirty: dirty.markStaticDirty,
  markInteractiveDirty: dirty.markInteractiveDirty,
  imageCache: ctx.imageCache,
  onInteractionStart: history.saveCheckpoint,
  onInteractionEnd: history.commitCheckpoint,
});

// Finalize in-progress operations when user switches tools
onBeforeToolChange(() => {
  if (multiElement.value) finalizeMultiPoint();
  if (editingLinearElement.value) exitLinearEditor();
  if (editingTextElement.value) submitTextEditor();
  if (editingCodeElement.value) submitCodeEditor();
  finalizeFreeDrawIfActive();
  cancelEraserIfActive();
});

const { newElement } = useDrawingInteraction({
  ...shared,
  activeTool,
  setTool,
  spaceHeld,
  isPanning,
  multiElement,
  startMultiPoint,
  getStyleOverrides: ctx.styleDefaults.getStyleOverrides,
  onElementCreated(el) {
    addElement(el);
    select(el.id);
    dirty.markInteractiveDirty();
  },
  markNewElementDirty: dirty.markNewElementDirty,
});

// Freedraw interaction
const { newFreeDrawElement, finalizeFreeDrawIfActive } = useFreeDrawInteraction({
  ...shared,
  activeTool,
  spaceHeld,
  isPanning,
  getStyleOverrides: ctx.styleDefaults.getStyleOverrides,
  onElementCreated(el) {
    addElement(el);
    // Freedraw elements are NOT auto-selected after drawing
    dirty.markInteractiveDirty();
  },
  markNewElementDirty: dirty.markNewElementDirty,
});

// Eraser interaction
const { pendingErasureIds, eraserTrailPoints, cancelEraserIfActive } = useEraserInteraction({
  ...shared,
  activeTool,
  spaceHeld,
  isPanning,
  elementMap,
  onDelete(elementsToDelete) {
    // Unbind bindings and delete bound text before soft-deleting
    for (const el of elementsToDelete) {
      if (isArrowElement(el)) {
        unbindArrow(el, elements.value);
        continue;
      }
      if ((el.boundElements ?? []).length > 0) {
        unbindAllArrowsFromShape(el, elements.value);
      }
      deleteBoundTextForContainer(el, elementMap);
    }
    for (const el of elementsToDelete) {
      mutateElement(el, { isDeleted: true });
    }
    const deletedIds = new Set(elementsToDelete.map((el) => el.id));
    cleanupAfterDelete(elements.value, deletedIds);
    clearSelection();
  },
  onInteractionStart: history.saveCheckpoint,
  recordAction: history.recordAction,
});

const { selectionBox, cursorStyle, hoveredMidpoint } = useSelectionInteraction({
  ...shared,
  activeTool,
  spaceHeld,
  isPanning,
  selectedElements: () => selectedElements.value,
  select,
  toggleSelection,
  clearSelection,
  replaceSelection,
  selectAll,
  isSelected,
  setTool,
  editingLinearElement,
  onDoubleClickLinear: enterLinearEditor,
  expandSelectionForGroups,
  onGroupAction: groupSelection,
  onUngroupAction: ungroupSelection,
  onDeleteCleanup: (deletedIds) => cleanupAfterDelete(elements.value, deletedIds),
  elementMap,
  onContainerChanged: (container) => updateBoundTextAfterContainerChange(container, elementMap),
  onInteractionStart: history.saveCheckpoint,
  onInteractionEnd: history.commitCheckpoint,
  recordAction: history.recordAction,
});

// Combine newElement from shape drawing and freedraw into one ref for the renderer
const activeNewElement = computed(() => newElement.value ?? newFreeDrawElement.value);

// Scene renderer (render callbacks + dirty watcher + animation controller)
const { markStaticDirty, markNewElementDirty, markInteractiveDirty } = useSceneRenderer({
  layers: { staticCtx, newElementCtx, interactiveCtx, staticRc, newElementRc },
  canvasRefs: { staticCanvasRef, newElementCanvasRef, interactiveCanvasRef },
  viewport: { scrollX, scrollY, zoom, width, height },
  elements,
  selectedElements,
  selectedIds,
  newElement: activeNewElement,
  selectionBox,
  editingLinearElement,
  editingPointIndices,
  editingHoveredMidpoint,
  multiElement,
  lastCursorPoint,
  suggestedBindings,
  hoveredMidpoint,
  selectedGroupIds,
  editingTextElement,
  editingCodeElement,
  eraserTrailPoints,
  pendingErasureIds,
  theme,
  imageCache: ctx.imageCache.cache,
});

// Bind real renderer callbacks to deferred dirty flags
dirty.bind({ markStaticDirty, markInteractiveDirty, markNewElementDirty });

// Clipboard (element copy/cut/paste)
function handleCopy(): void {
  if (selectedElements.value.length === 0) return;
  clipboardCopy(selectedElements.value);
}

function handleCut(): void {
  if (selectedElements.value.length === 0) return;
  clipboardCut(selectedElements.value, {
    markDeleted(els) {
      for (const el of els) {
        mutateElement(el, { isDeleted: true });
      }
      clearSelection();
      dirty.markStaticDirty();
      dirty.markInteractiveDirty();
    },
  });
}

function handlePaste(): void {
  clipboardPaste({
    addElement,
    select,
    replaceSelection,
    markStaticDirty: dirty.markStaticDirty,
    markInteractiveDirty: dirty.markInteractiveDirty,
  });
}

function handleDuplicate(): void {
  if (selectedElements.value.length === 0) return;
  handleCopy();
  handlePaste();
}

// Register all actions in the unified registry
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const TOOL_DEFS: { type: ToolType; icon: string; kbd: string }[] = [
  { type: "selection", icon: "i-lucide-mouse-pointer", kbd: "V" },
  { type: "hand", icon: "i-lucide-hand", kbd: "H" },
  { type: "rectangle", icon: "i-lucide-square", kbd: "R" },
  { type: "diamond", icon: "i-lucide-diamond", kbd: "D" },
  { type: "ellipse", icon: "i-lucide-circle", kbd: "O" },
  { type: "arrow", icon: "i-lucide-arrow-right", kbd: "A" },
  { type: "text", icon: "i-lucide-type", kbd: "T" },
  { type: "freedraw", icon: "i-lucide-pencil", kbd: "P" },
  { type: "code", icon: "i-lucide-code", kbd: "C" },
  { type: "line", icon: "i-lucide-minus", kbd: "L" },
  { type: "image", icon: "i-lucide-image", kbd: "I" },
  { type: "eraser", icon: "i-lucide-eraser", kbd: "E" },
];

register([
  // Tools
  ...TOOL_DEFS.map(
    ({ type, icon, kbd }): ActionDefinition => ({
      id: `tool:${type}`,
      label: capitalize(type),
      icon,
      kbds: [kbd] as readonly string[],
      handler: () => setTool(type),
    }),
  ),
  // Actions
  {
    id: "action:delete",
    label: "Delete",
    icon: "i-lucide-trash-2",
    kbds: ["delete"],
    handler: () => history.recordAction(handleDelete),
    enabled: () => selectedElements.value.length > 0,
  },
  {
    id: "action:duplicate",
    label: "Duplicate",
    icon: "i-lucide-copy",
    kbds: ["meta", "D"],
    handler: () => history.recordAction(handleDuplicate),
    enabled: () => selectedElements.value.length > 0,
  },
  {
    id: "action:select-all",
    label: "Select All",
    icon: "i-lucide-box-select",
    kbds: ["meta", "A"],
    handler: selectAll,
  },
  {
    id: "action:group",
    label: "Group",
    icon: "i-lucide-group",
    kbds: ["meta", "G"],
    handler: () => history.recordAction(groupSelection),
    enabled: () => selectedIds.value.size > 1,
  },
  {
    id: "action:ungroup",
    label: "Ungroup",
    icon: "i-lucide-ungroup",
    kbds: ["meta", "shift", "G"],
    handler: () => history.recordAction(ungroupSelection),
    enabled: () => selectedGroupIds.value.size > 0,
  },
  // Layers
  {
    id: "layer:bring-to-front",
    label: "Bring to Front",
    icon: "i-lucide-bring-to-front",
    kbds: ["meta", "shift", "]"],
    handler: () => history.recordAction(() => applyLayerAction(layerOrder.bringToFront)),
    enabled: () => selectedElements.value.length > 0,
  },
  {
    id: "layer:bring-forward",
    label: "Bring Forward",
    icon: "i-lucide-move-up",
    kbds: ["meta", "]"],
    handler: () => history.recordAction(() => applyLayerAction(layerOrder.bringForward)),
    enabled: () => selectedElements.value.length > 0,
  },
  {
    id: "layer:send-backward",
    label: "Send Backward",
    icon: "i-lucide-move-down",
    kbds: ["meta", "["],
    handler: () => history.recordAction(() => applyLayerAction(layerOrder.sendBackward)),
    enabled: () => selectedElements.value.length > 0,
  },
  {
    id: "layer:send-to-back",
    label: "Send to Back",
    icon: "i-lucide-send-to-back",
    kbds: ["meta", "shift", "["],
    handler: () => history.recordAction(() => applyLayerAction(layerOrder.sendToBack)),
    enabled: () => selectedElements.value.length > 0,
  },
  // Settings
  {
    id: "settings:toggle-theme",
    label: "Toggle Theme",
    icon: "i-lucide-sun-moon",
    kbds: ["alt", "shift", "D"],
    handler: toggleTheme,
  },
  // Styles
  {
    id: "style:copy-styles",
    label: "Copy Styles",
    icon: "i-lucide-paintbrush",
    kbds: ["meta", "alt", "C"],
    handler: () => copyStyles(selectedElements.value[0]!),
    enabled: () => selectedElements.value.length > 0,
  },
  {
    id: "style:paste-styles",
    label: "Paste Styles",
    icon: "i-lucide-clipboard-paste",
    kbds: ["meta", "alt", "V"],
    handler: () =>
      history.recordAction(() => pasteStyles([...selectedElements.value], dirty.markStaticDirty)),
    enabled: () => selectedElements.value.length > 0 && hasStoredStyles.value,
  },
  // Clipboard
  {
    id: "clipboard:copy",
    label: "Copy",
    icon: "i-lucide-copy",
    kbds: ["meta", "C"],
    handler: handleCopy,
    enabled: () => selectedElements.value.length > 0,
  },
  {
    id: "clipboard:cut",
    label: "Cut",
    icon: "i-lucide-scissors",
    kbds: ["meta", "X"],
    handler: () => history.recordAction(handleCut),
    enabled: () => selectedElements.value.length > 0,
  },
  {
    id: "clipboard:paste",
    label: "Paste",
    icon: "i-lucide-clipboard",
    kbds: ["meta", "V"],
    handler: () => history.recordAction(handlePaste),
  },
  // History
  {
    id: "history:undo",
    label: "Undo",
    icon: "i-lucide-undo-2",
    kbds: ["meta", "Z"],
    handler: history.undo,
    enabled: () => history.canUndo.value,
  },
  {
    id: "history:redo",
    label: "Redo",
    icon: "i-lucide-redo-2",
    kbds: ["meta", "shift", "Z"],
    handler: history.redo,
    enabled: () => history.canRedo.value,
  },
]);

// Expose selection/history/dirty to the context so app-layer composables can use them
ctx.selection.value = { selectedElements, select };
ctx.history.value = { recordAction: history.recordAction };
ctx.dirty.value = { markStaticDirty: dirty.markStaticDirty };

// Test hook — expose reactive state for browser tests (Excalidraw's window.h pattern).
// Always available (SSR disabled, zero overhead — just window property assignments).
(globalThis as unknown as Record<string, unknown>).__h = {
  elements,
  elementMap,
  addElement,
  replaceElements,
  getElementById,
  selectedIds,
  selectedElements,
  select,
  addToSelection,
  clearSelection,
  replaceSelection,
  isSelected,
  activeTool,
  setTool,
  scrollX,
  scrollY,
  zoom,
  panBy,
  zoomBy,
  toScene,
  newElement,
  multiElement,
  editingTextElement,
  markStaticDirty,
  markInteractiveDirty,
  history,
  pendingErasureIds,
  eraserTrailPoints,
  imageCache: ctx.imageCache,
  staticCanvasRef,
  newElementCanvasRef,
  interactiveCanvasRef,
};

function handlePropertyChange(): void {
  history.commitCheckpoint();
  dirty.markStaticDirty();
}

const CROSSHAIR_TOOLS = new Set<ToolType>(["text", "code", "image", "freedraw", "eraser"]);

const combinedCursor = computed(() => {
  if (panningCursor.value !== "default") return panningCursor.value;
  if (multiElement.value) return "crosshair";
  if (editingLinearElement.value) return "pointer";
  if (CROSSHAIR_TOOLS.has(activeTool.value)) return "crosshair";
  if (activeTool.value === "selection" && cursorStyle.value !== "default") {
    return cursorStyle.value;
  }
  return "default";
});

defineExpose({
  elements,
  addElement,
  replaceElements,
  selectedIds,
  select,
  clearSelection,
  activeTool,
  setTool,
  scrollX,
  scrollY,
  zoom,
  panBy,
  zoomBy,
  toScene,
  history,
  contextMenuItems,
});
</script>

<template>
  <div
    ref="container"
    data-testid="canvas-container"
    class="drawvue-container"
    :style="{ cursor: combinedCursor }"
  >
    <canvas ref="staticCanvas" class="drawvue-canvas drawvue-canvas--static" />
    <canvas ref="newElementCanvas" class="drawvue-canvas drawvue-canvas--new-element" />
    <canvas
      ref="interactiveCanvas"
      data-testid="interactive-canvas"
      class="drawvue-canvas drawvue-canvas--interactive"
      @contextmenu="handleContextMenu"
    />
    <div ref="textEditorContainer" class="drawvue-text-editor" />

    <slot name="toolbar" :active-tool="activeTool" :set-tool="setTool" />

    <slot
      name="bottom-bar"
      :zoom="zoom"
      :can-undo="history.canUndo.value"
      :can-redo="history.canRedo.value"
      :zoom-in="() => zoomBy(0.1)"
      :zoom-out="() => zoomBy(-0.1)"
      :zoom-reset="() => zoomTo(1)"
      :undo="history.undo"
      :redo="history.redo"
    />

    <slot
      name="properties"
      :selected-elements="selectedElements"
      :active-tool="activeTool"
      :show-tool-properties="showToolProperties"
      :on-will-change="history.saveCheckpoint"
      :on-mark-dirty="handlePropertyChange"
    />

    <slot />
  </div>
</template>

<style>
.drawvue-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.drawvue-canvas {
  position: absolute;
  inset: 0;
}

.drawvue-canvas--static,
.drawvue-canvas--new-element {
  pointer-events: none;
  z-index: 1;
}

.drawvue-canvas--interactive {
  z-index: 2;
}

.drawvue-text-editor {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
}
</style>
