<script setup lang="ts">
import { shallowRef, useTemplateRef, computed } from "vue";
import { useElementSize, useEventListener, useActiveElement } from "@vueuse/core";
import { useViewport } from "../composables/useViewport";
import { useCanvasLayers } from "../composables/useCanvasLayers";
import { useSceneRenderer } from "../composables/useSceneRenderer";
import { usePanning } from "../composables/usePanning";
import { createDirtyFlags } from "../composables/createDirtyFlags";
import type { ExcalidrawElement } from "~/features/elements/types";
import { useElements } from "~/features/elements/useElements";
import { useLayerOrder } from "~/features/elements/composables/useLayerOrder";
import { mutateElement } from "~/features/elements/mutateElement";
import type { ToolType } from "~/features/tools/types";
import { isDrawingTool, isFreeDrawTool, isTextTool } from "~/features/tools/types";
import { useToolStore } from "~/features/tools/useTool";
import { useDrawingInteraction } from "~/features/tools/useDrawingInteraction";
import { useFreeDrawInteraction } from "~/features/tools/useFreeDrawInteraction";
import { useTextInteraction } from "~/features/tools/useTextInteraction";
import { useCodeInteraction } from "~/features/code";
import { useImageInteraction } from "~/features/image";
import { useSelection, useSelectionInteraction, getElementAtPosition } from "~/features/selection";
import { useMultiPointCreation } from "~/features/linear-editor/useMultiPointCreation";
import { useLinearEditor } from "~/features/linear-editor/useLinearEditor";
import { updateBoundTextAfterContainerChange } from "~/features/binding";
import { useGroups } from "~/features/groups/composables/useGroups";
import { cleanupAfterDelete } from "~/features/groups/groupUtils";
import { useClipboard } from "~/features/clipboard";
import { useCommandPalette } from "~/features/command-palette";
import { useContextMenu } from "~/features/context-menu";
import { useTheme } from "~/features/theme";
import { PropertiesPanel } from "~/features/properties";
import { useStyleClipboard } from "~/features/properties/composables/useStyleClipboard";
import { useActionRegistry, type ActionDefinition } from "~/shared/useActionRegistry";
import DrawingToolbar from "~/features/tools/components/DrawingToolbar.vue";
import { isTypingElement } from "~/shared/isTypingElement";

defineExpose({});

// Template refs
const containerRef = useTemplateRef<HTMLDivElement>("container");
const staticCanvasRef = useTemplateRef<HTMLCanvasElement>("staticCanvas");
const newElementCanvasRef = useTemplateRef<HTMLCanvasElement>("newElementCanvas");
const interactiveCanvasRef = useTemplateRef<HTMLCanvasElement>("interactiveCanvas");
const textEditorContainerRef = useTemplateRef<HTMLDivElement>("textEditorContainer");

// Viewport & size
const { width, height } = useElementSize(containerRef);
const { scrollX, scrollY, zoom, zoomBy, panBy, toScene } = useViewport();

// Domain state
const { elements, elementMap, addElement, replaceElements, getElementById } = useElements();
const { activeTool, setTool, onBeforeToolChange } = useToolStore();

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
const { menuType: contextMenuType, items: contextMenuItems } = useContextMenu();

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
const { copyStyles, pasteStyles, hasStoredStyles } = useStyleClipboard();
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
    pasteStyles([...selectedElements.value], dirty.markStaticDirty);
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
    handleCut();
    return;
  }

  if (e.code === "KeyV") {
    e.preventDefault();
    handlePaste();
  }
});

// Panning (only needs canvasRef, panBy, zoomBy, activeTool — all available early)
const { cursorClass, spaceHeld, isPanning } = usePanning({
  canvasRef: interactiveCanvasRef,
  panBy,
  zoomBy,
  activeTool,
});

// Shared context threaded into multiple composables
const shared = {
  canvasRef: interactiveCanvasRef,
  toScene,
  zoom,
  elements,
  suggestedBindings,
  markStaticDirty: dirty.markStaticDirty,
  markInteractiveDirty: dirty.markInteractiveDirty,
};

const { multiElement, lastCursorPoint, finalizeMultiPoint } = useMultiPointCreation({
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
  elementMap,
  addElement,
  getElementById,
  select,
  markStaticDirty: dirty.markStaticDirty,
  markInteractiveDirty: dirty.markInteractiveDirty,
  spaceHeld,
  isPanning,
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
});

// Finalize in-progress operations when user switches tools
onBeforeToolChange(() => {
  if (multiElement.value) finalizeMultiPoint();
  if (editingLinearElement.value) exitLinearEditor();
  if (editingTextElement.value) submitTextEditor();
  if (editingCodeElement.value) submitCodeEditor();
  finalizeFreeDrawIfActive();
});

// Drawing & selection own their refs internally
const { newElement } = useDrawingInteraction({
  ...shared,
  activeTool,
  setTool,
  spaceHeld,
  isPanning,
  multiElement,
  onElementCreated(el) {
    addElement(el);
    select(el.id);
    dirty.markInteractiveDirty();
  },
  markNewElementDirty: dirty.markNewElementDirty,
});

// Freedraw interaction (pencil tool) — separate from drawing interaction
const { newFreeDrawElement, finalizeFreeDrawIfActive } = useFreeDrawInteraction({
  ...shared,
  activeTool,
  spaceHeld,
  isPanning,
  onElementCreated(el) {
    addElement(el);
    // Freedraw elements are NOT auto-selected after drawing
    dirty.markInteractiveDirty();
  },
  markNewElementDirty: dirty.markNewElementDirty,
});

const { selectionBox, cursorStyle } = useSelectionInteraction({
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
  selectedGroupIds,
  editingTextElement,
  editingCodeElement,
});

// Bind real renderer callbacks to deferred dirty flags
dirty.bind({ markStaticDirty, markInteractiveDirty, markNewElementDirty });

// Clipboard (element copy/cut/paste)
const { copy: clipboardCopy, cut: clipboardCut, paste: clipboardPaste } = useClipboard();

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
const { toggleTheme } = useTheme();
const { register } = useActionRegistry();
// Keep useCommandPalette alive so its global state is initialized
useCommandPalette();

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
];

register([
  // Tools
  ...TOOL_DEFS.map(
    ({ type, icon, kbd }): ActionDefinition => ({
      id: `tool:${type}`,
      label: type.charAt(0).toUpperCase() + type.slice(1),
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
    handler: handleDelete,
    enabled: () => selectedElements.value.length > 0,
  },
  {
    id: "action:duplicate",
    label: "Duplicate",
    icon: "i-lucide-copy",
    kbds: ["meta", "D"],
    handler: handleDuplicate,
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
    handler: groupSelection,
    enabled: () => selectedIds.value.size > 1,
  },
  {
    id: "action:ungroup",
    label: "Ungroup",
    icon: "i-lucide-ungroup",
    kbds: ["meta", "shift", "G"],
    handler: ungroupSelection,
    enabled: () => selectedGroupIds.value.size > 0,
  },
  // Layers
  {
    id: "layer:bring-to-front",
    label: "Bring to Front",
    icon: "i-lucide-bring-to-front",
    kbds: ["meta", "shift", "]"],
    handler: () => applyLayerAction(layerOrder.bringToFront),
    enabled: () => selectedElements.value.length > 0,
  },
  {
    id: "layer:bring-forward",
    label: "Bring Forward",
    icon: "i-lucide-move-up",
    kbds: ["meta", "]"],
    handler: () => applyLayerAction(layerOrder.bringForward),
    enabled: () => selectedElements.value.length > 0,
  },
  {
    id: "layer:send-backward",
    label: "Send Backward",
    icon: "i-lucide-move-down",
    kbds: ["meta", "["],
    handler: () => applyLayerAction(layerOrder.sendBackward),
    enabled: () => selectedElements.value.length > 0,
  },
  {
    id: "layer:send-to-back",
    label: "Send to Back",
    icon: "i-lucide-send-to-back",
    kbds: ["meta", "shift", "["],
    handler: () => applyLayerAction(layerOrder.sendToBack),
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
    handler: () => pasteStyles([...selectedElements.value], dirty.markStaticDirty),
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
    handler: handleCut,
    enabled: () => selectedElements.value.length > 0,
  },
  {
    id: "clipboard:paste",
    label: "Paste",
    icon: "i-lucide-clipboard",
    kbds: ["meta", "V"],
    handler: handlePaste,
  },
]);

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
};

const CROSSHAIR_TOOLS = new Set<ToolType>(["text", "code", "image", "freedraw"]);

const combinedCursorClass = computed(() => {
  if (cursorClass.value !== "cursor-default") return cursorClass.value;
  if (multiElement.value) return "cursor-crosshair";
  if (editingLinearElement.value) return "cursor-pointer";
  if (CROSSHAIR_TOOLS.has(activeTool.value)) return "cursor-crosshair";
  if (activeTool.value === "selection" && cursorStyle.value !== "default") {
    return `cursor-${cursorStyle.value}`;
  }
  return "cursor-default";
});
</script>

<template>
  <div
    ref="container"
    data-testid="canvas-container"
    class="relative h-full w-full overflow-hidden"
    :class="combinedCursorClass"
  >
    <canvas ref="staticCanvas" class="pointer-events-none absolute inset-0 z-[1]" />
    <canvas ref="newElementCanvas" class="pointer-events-none absolute inset-0 z-[1]" />
    <UContextMenu :items="contextMenuItems">
      <canvas
        ref="interactiveCanvas"
        data-testid="interactive-canvas"
        class="absolute inset-0 z-[2]"
        @contextmenu="handleContextMenu"
      />
    </UContextMenu>
    <div ref="textEditorContainer" class="pointer-events-none absolute inset-0 z-[3]" />
    <DrawingToolbar />
    <PropertiesPanel
      v-if="selectedElements.length > 0 || showToolProperties"
      :selected-elements="selectedElements"
      :active-tool="activeTool"
      @mark-dirty="dirty.markStaticDirty"
    />
  </div>
</template>
