<script setup lang="ts">
import { shallowRef, useTemplateRef, computed, watchEffect } from 'vue'
import { useElementSize, useEventListener, useActiveElement } from '@vueuse/core'
import { useViewport } from '../composables/useViewport'
import { useCanvasLayers } from '../composables/useCanvasLayers'
import { useSceneRenderer } from '../composables/useSceneRenderer'
import { usePanning } from '../composables/usePanning'
import { createDirtyFlags } from '../composables/createDirtyFlags'
import { useElements } from '~/features/elements/useElements'
import { useLayerOrder } from '~/features/elements/composables/useLayerOrder'
import { mutateElement } from '~/features/elements/mutateElement'
import { useToolStore } from '~/features/tools/useTool'
import type { ToolType } from '~/features/tools/types'
import { useDrawingInteraction } from '~/features/tools/useDrawingInteraction'
import { useTextInteraction } from '~/features/tools/useTextInteraction'
import { useCodeInteraction } from '~/features/code'
import { useImageInteraction } from '~/features/image'
import { useSelection, useSelectionInteraction } from '~/features/selection'
import { useMultiPointCreation } from '~/features/linear-editor/useMultiPointCreation'
import { useLinearEditor } from '~/features/linear-editor/useLinearEditor'
import type { ExcalidrawElement } from '~/features/elements/types'
import { updateBoundTextAfterContainerChange } from '~/features/binding'
import { useGroups } from '~/features/groups/composables/useGroups'
import { cleanupAfterDelete } from '~/features/groups/groupUtils'
import { useTheme, THEME } from '~/features/theme'
import { useContextMenu, ContextMenu } from '~/features/context-menu'
import type { ContextMenuContext } from '~/features/context-menu'
import { getElementAtPosition } from '~/features/selection'
import DrawingToolbar from '~/features/tools/components/DrawingToolbar.vue'
import { PropertiesPanel } from '~/features/properties'
import { useStyleClipboard } from '~/features/properties/composables/useStyleClipboard'
import { isTypingElement } from '~/shared/isTypingElement'

defineExpose({})

// Theme class on document root
const { theme } = useTheme()
watchEffect(() => {
  document.documentElement.classList.toggle('theme--dark', theme.value === THEME.DARK)
})

// Template refs
const containerRef = useTemplateRef<HTMLDivElement>('container')
const staticCanvasRef = useTemplateRef<HTMLCanvasElement>('staticCanvas')
const newElementCanvasRef = useTemplateRef<HTMLCanvasElement>('newElementCanvas')
const interactiveCanvasRef = useTemplateRef<HTMLCanvasElement>('interactiveCanvas')
const textEditorContainerRef = useTemplateRef<HTMLDivElement>('textEditorContainer')

// Viewport & size
const { width, height } = useElementSize(containerRef)
const { scrollX, scrollY, zoom, zoomBy, panBy, toScene } = useViewport()

// Domain state
const { elements, elementMap, addElement, replaceElements, getElementById } = useElements()
const { activeTool, setTool, onBeforeToolChange } = useToolStore()

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
} = useSelection(elements)

const suggestedBindings = shallowRef<readonly ExcalidrawElement[]>([])

// Canvas layers (contexts + RoughCanvas init)
const { staticCtx, newElementCtx, interactiveCtx, staticRc, newElementRc } = useCanvasLayers({
  staticCanvasRef,
  newElementCanvasRef,
  interactiveCanvasRef,
})

// Stable deferred dirty callbacks — safe no-ops until bind()
const dirty = createDirtyFlags()

const {
  selectedGroupIds,
  groupSelection,
  ungroupSelection,
  expandSelectionForGroups,
} = useGroups({
  elements,
  selectedIds,
  selectedElements: () => selectedElements.value,
  replaceSelection,
  replaceElements,
  markStaticDirty: dirty.markStaticDirty,
  markInteractiveDirty: dirty.markInteractiveDirty,
})

// Layer order
const layerOrder = useLayerOrder({ elements, replaceElements })

function applyLayerAction(action: (ids: ReadonlySet<string>) => void): void {
  action(selectedIds.value)
  dirty.markStaticDirty()
  dirty.markInteractiveDirty()
}

function handleDeleteFromPanel(): void {
  const selected = selectedElements.value
  if (selected.length === 0) return
  for (const el of selected) {
    mutateElement(el, { isDeleted: true })
  }
  const deletedIds = new Set(selected.map(el => el.id))
  cleanupAfterDelete(elements.value, deletedIds)
  clearSelection()
  dirty.markStaticDirty()
  dirty.markInteractiveDirty()
}

// Context menu
function getContextMenuContext(): ContextMenuContext {
  return {
    selectedIds: selectedIds.value,
    selectedElements: selectedElements.value,
    hasGroups: selectedGroupIds.value.size > 0,
    isMultiSelect: selectedIds.value.size > 1,
    markDirty: dirty.markStaticDirty,
  }
}

const {
  isOpen: contextMenuOpen,
  position: contextMenuPosition,
  filteredItems: contextMenuItems,
  open: openContextMenu,
  close: closeContextMenu,
} = useContextMenu({ context: getContextMenuContext })

function handleContextMenu(e: MouseEvent): void {
  e.preventDefault()
  closeContextMenu()

  const scenePoint = toScene(e.offsetX, e.offsetY)
  const hitElement = getElementAtPosition(scenePoint, elements.value, zoom.value)

  if (hitElement) {
    if (!isSelected(hitElement.id)) {
      select(hitElement.id)
      expandSelectionForGroups()
      dirty.markInteractiveDirty()
    }
    openContextMenu(e, 'element')
    return
  }

  clearSelection()
  dirty.markInteractiveDirty()
  openContextMenu(e, 'canvas')
}

// Style clipboard keyboard shortcuts (Cmd+Alt+C / Cmd+Alt+V)
const { copyStyles, pasteStyles, hasStoredStyles } = useStyleClipboard()
const activeEl = useActiveElement()
useEventListener(document, 'keydown', (e: KeyboardEvent) => {
  if (isTypingElement(activeEl.value)) return
  if (!e.metaKey || !e.altKey) return

  if (e.code === 'KeyC') {
    if (selectedElements.value.length === 0) return
    e.preventDefault()
    copyStyles(selectedElements.value[0]!)
    return
  }

  if (e.code === 'KeyV') {
    if (selectedElements.value.length === 0) return
    if (!hasStoredStyles.value) return
    e.preventDefault()
    pasteStyles([...selectedElements.value], dirty.markStaticDirty)
  }
})

// Panning (only needs canvasRef, panBy, zoomBy, activeTool — all available early)
const { cursorClass, spaceHeld, isPanning } = usePanning({
  canvasRef: interactiveCanvasRef,
  panBy,
  zoomBy,
  activeTool,
})

// Shared context threaded into multiple composables
const shared = {
  canvasRef: interactiveCanvasRef,
  toScene,
  zoom,
  elements,
  suggestedBindings,
  markStaticDirty: dirty.markStaticDirty,
  markInteractiveDirty: dirty.markInteractiveDirty,
}

const {
  multiElement,
  lastCursorPoint,
  finalizeMultiPoint,
} = useMultiPointCreation({
  ...shared,
  onFinalize() {
    setTool('selection')
  },
})

const {
  editingElement: editingLinearElement,
  selectedPointIndices: editingPointIndices,
  hoveredMidpointIndex: editingHoveredMidpoint,
  enterEditor: enterLinearEditor,
  exitEditor: exitLinearEditor,
} = useLinearEditor({
  ...shared,
  select,
})

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
})

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
})

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
})

// Finalize in-progress operations when user switches tools
onBeforeToolChange(() => {
  if (multiElement.value) finalizeMultiPoint()
  if (editingLinearElement.value) exitLinearEditor()
  if (editingTextElement.value) submitTextEditor()
  if (editingCodeElement.value) submitCodeEditor()
})

// Drawing & selection own their refs internally
const { newElement } = useDrawingInteraction({
  ...shared,
  activeTool,
  setTool,
  spaceHeld,
  isPanning,
  multiElement,
  onElementCreated(el) {
    addElement(el)
    select(el.id)
    dirty.markInteractiveDirty()
  },
  markNewElementDirty: dirty.markNewElementDirty,
})

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
})

// Scene renderer (render callbacks + dirty watcher + animation controller)
const { markStaticDirty, markNewElementDirty, markInteractiveDirty } = useSceneRenderer({
  layers: { staticCtx, newElementCtx, interactiveCtx, staticRc, newElementRc },
  canvasRefs: { staticCanvasRef, newElementCanvasRef, interactiveCanvasRef },
  viewport: { scrollX, scrollY, zoom, width, height },
  elements,
  selectedElements,
  selectedIds,
  newElement,
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
})

// Bind real renderer callbacks to deferred dirty flags
dirty.bind({ markStaticDirty, markInteractiveDirty, markNewElementDirty })

// Test hook — expose reactive state for browser tests (Excalidraw's window.h pattern).
// Always available (SSR disabled, zero overhead — just window property assignments).
;(globalThis as unknown as Record<string, unknown>).__h = {
  elements, elementMap, addElement, replaceElements, getElementById,
  selectedIds, selectedElements, select, addToSelection,
  clearSelection, replaceSelection, isSelected,
  activeTool, setTool,
  scrollX, scrollY, zoom, panBy, zoomBy, toScene,
  newElement, multiElement, editingTextElement,
  markStaticDirty, markInteractiveDirty,
}

const CROSSHAIR_TOOLS = new Set<ToolType>(['text', 'code', 'image'])

const combinedCursorClass = computed(() => {
  if (cursorClass.value !== 'cursor-default') return cursorClass.value
  if (multiElement.value) return 'cursor-crosshair'
  if (editingLinearElement.value) return 'cursor-pointer'
  if (CROSSHAIR_TOOLS.has(activeTool.value)) return 'cursor-crosshair'
  if (activeTool.value === 'selection' && cursorStyle.value !== 'default') {
    return `cursor-${cursorStyle.value}`
  }
  return 'cursor-default'
})
</script>

<template>
  <div
    ref="container"
    data-testid="canvas-container"
    class="relative h-full w-full overflow-hidden"
    :class="combinedCursorClass"
  >
    <canvas
      ref="staticCanvas"
      class="pointer-events-none absolute inset-0 z-[1]"
    />
    <canvas
      ref="newElementCanvas"
      class="pointer-events-none absolute inset-0 z-[1]"
    />
    <canvas
      ref="interactiveCanvas"
      data-testid="interactive-canvas"
      class="absolute inset-0 z-[2]"
      @contextmenu="handleContextMenu"
    />
    <div
      ref="textEditorContainer"
      class="pointer-events-none absolute inset-0 z-[3]"
    />
    <DrawingToolbar />
    <PropertiesPanel
      v-if="selectedElements.length > 0"
      :selected-elements="selectedElements"
      @mark-dirty="dirty.markStaticDirty"
      @bring-to-front="applyLayerAction(layerOrder.bringToFront)"
      @bring-forward="applyLayerAction(layerOrder.bringForward)"
      @send-backward="applyLayerAction(layerOrder.sendBackward)"
      @send-to-back="applyLayerAction(layerOrder.sendToBack)"
      @delete="handleDeleteFromPanel"
    />
    <ContextMenu
      :is-open="contextMenuOpen"
      :position="contextMenuPosition"
      :items="contextMenuItems"
      :context="getContextMenuContext()"
      @close="closeContextMenu"
    />
  </div>
</template>
