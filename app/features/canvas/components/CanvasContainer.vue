<script setup lang="ts">
import { shallowRef, useTemplateRef, computed, watchEffect } from 'vue'
import { useElementSize } from '@vueuse/core'
import { useViewport } from '../composables/useViewport'
import { useCanvasLayers } from '../composables/useCanvasLayers'
import { useSceneRenderer } from '../composables/useSceneRenderer'
import { usePanning } from '../composables/usePanning'
import { createDirtyFlags } from '../composables/createDirtyFlags'
import { useElements } from '~/features/elements/useElements'
import { useToolStore } from '~/features/tools/useTool'
import { useDrawingInteraction } from '~/features/tools/useDrawingInteraction'
import { useTextInteraction } from '~/features/tools/useTextInteraction'
import { useSelection, useSelectionInteraction } from '~/features/selection'
import { useMultiPointCreation } from '~/features/linear-editor/useMultiPointCreation'
import { useLinearEditor } from '~/features/linear-editor/useLinearEditor'
import type { ExcalidrawElement } from '~/features/elements/types'
import { useGroups } from '~/features/groups/composables/useGroups'
import { cleanupAfterDelete } from '~/features/groups/groupUtils'
import { useTheme, THEME } from '~/features/theme'
import DrawingToolbar from '~/features/tools/components/DrawingToolbar.vue'

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
const { elements, addElement, replaceElements } = useElements()
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
  addElement,
  select,
  markStaticDirty: dirty.markStaticDirty,
  markInteractiveDirty: dirty.markInteractiveDirty,
  spaceHeld,
  isPanning,
})

// Finalize in-progress operations when user switches tools
onBeforeToolChange(() => {
  if (multiElement.value) finalizeMultiPoint()
  if (editingLinearElement.value) exitLinearEditor()
  if (editingTextElement.value) submitTextEditor()
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
  addToSelection,
  toggleSelection,
  clearSelection,
  replaceSelection,
  selectAll,
  isSelected,
  setTool,
  editingLinearElement,
  onDoubleClickArrow: enterLinearEditor,
  expandSelectionForGroups,
  onGroupAction: groupSelection,
  onUngroupAction: ungroupSelection,
  onDeleteCleanup: (deletedIds) => cleanupAfterDelete(elements.value, deletedIds),
})

// Scene renderer (render callbacks + dirty watcher + animation controller)
const { markStaticDirty, markNewElementDirty, markInteractiveDirty, animations } = useSceneRenderer({
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
})

// Bind real renderer callbacks to deferred dirty flags
dirty.bind({ markStaticDirty, markInteractiveDirty, markNewElementDirty })

// Expose animation controller for interaction composables (available before any user events fire)
Object.assign(shared, { animations })

const combinedCursorClass = computed(() => {
  // Panning cursor takes priority over selection cursor
  if (cursorClass.value !== 'cursor-default') return cursorClass.value
  // Multi-point mode → crosshair
  if (multiElement.value) return 'cursor-crosshair'
  // Linear editor mode → pointer for handles
  if (editingLinearElement.value) return 'cursor-pointer'
  // Text tool cursor (crosshair like Excalidraw)
  if (activeTool.value === 'text') return 'cursor-crosshair'
  // Selection interaction cursor only applies in selection tool mode
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
    />
    <div
      ref="textEditorContainer"
      class="pointer-events-none absolute inset-0 z-[3]"
    />
    <DrawingToolbar />
  </div>
</template>
