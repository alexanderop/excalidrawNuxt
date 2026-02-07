<script setup lang="ts">
import { shallowRef, useTemplateRef, computed } from 'vue'
import { useElementSize } from '@vueuse/core'
import { useViewport } from '../composables/useViewport'
import { useCanvasLayers } from '../composables/useCanvasLayers'
import { useSceneRenderer } from '../composables/useSceneRenderer'
import { usePanning } from '../composables/usePanning'
import { useElements } from '~/features/elements/useElements'
import { useTool } from '~/features/tools/useTool'
import { useDrawingInteraction } from '~/features/tools/useDrawingInteraction'
import { useSelection, useSelectionInteraction } from '~/features/selection'
import { useMultiPointCreation } from '~/features/linear-editor/useMultiPointCreation'
import { useLinearEditor } from '~/features/linear-editor/useLinearEditor'
import type { ExcalidrawArrowElement, ExcalidrawElement } from '~/features/elements/types'
import type { Box } from '~/shared/math'
import DrawingToolbar from '~/features/tools/components/DrawingToolbar.vue'

defineExpose({})

// Template refs
const containerRef = useTemplateRef<HTMLDivElement>('container')
const staticCanvasRef = useTemplateRef<HTMLCanvasElement>('staticCanvas')
const newElementCanvasRef = useTemplateRef<HTMLCanvasElement>('newElementCanvas')
const interactiveCanvasRef = useTemplateRef<HTMLCanvasElement>('interactiveCanvas')

// Viewport & size
const { width, height } = useElementSize(containerRef)
const { scrollX, scrollY, zoom, zoomBy, panBy, toScene } = useViewport()

// Domain state
const { elements, addElement } = useElements()

// Finalization callbacks — set after composables are created
let doFinalizeMultiPoint: (() => void) | null = null
let doExitLinearEditor: (() => void) | null = null

const { activeTool, setTool } = useTool({
  onToolChange() {
    doFinalizeMultiPoint?.()
    doExitLinearEditor?.()
  },
})

const {
  selectedIds,
  selectedElements,
  select,
  addToSelection,
  toggleSelection,
  clearSelection,
  selectAll,
  isSelected,
} = useSelection(elements)

// Pre-create shared refs to break circular dependency
const newElement = shallowRef<ExcalidrawElement | null>(null)
const selectionBox = shallowRef<Box | null>(null)
const suggestedBindings = shallowRef<readonly ExcalidrawElement[]>([])

// Canvas layers (contexts + RoughCanvas init)
const { staticCtx, newElementCtx, interactiveCtx, staticRc, newElementRc } = useCanvasLayers({
  staticCanvasRef,
  newElementCanvasRef,
  interactiveCanvasRef,
})

// Deferred dirty callbacks — populated after scene renderer init
const dirtyCallbacks = { markStaticDirty: () => {}, markInteractiveDirty: () => {} }

const {
  multiElement,
  lastCursorPoint,
  finalizeMultiPoint,
} = useMultiPointCreation({
  canvasRef: interactiveCanvasRef,
  toScene,
  markStaticDirty: () => dirtyCallbacks.markStaticDirty(),
  markInteractiveDirty: () => dirtyCallbacks.markInteractiveDirty(),
  onFinalize() {
    activeTool.value = 'selection'
  },
  elements,
  zoom,
  suggestedBindings,
})

const {
  editingElement: editingLinearElement,
  selectedPointIndices: editingPointIndices,
  hoveredMidpointIndex: editingHoveredMidpoint,
  enterEditor: enterLinearEditor,
  exitEditor: exitLinearEditor,
} = useLinearEditor({
  canvasRef: interactiveCanvasRef,
  zoom,
  toScene,
  markStaticDirty: () => dirtyCallbacks.markStaticDirty(),
  markInteractiveDirty: () => dirtyCallbacks.markInteractiveDirty(),
  select,
  elements,
  suggestedBindings,
})

// Wire finalization callbacks for tool switching
doFinalizeMultiPoint = () => {
  if (multiElement.value) {
    finalizeMultiPoint()
  }
}
doExitLinearEditor = () => {
  if (editingLinearElement.value) {
    exitLinearEditor()
  }
}

// Scene renderer (render callbacks + dirty watcher)
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
})

// Resolve the deferred callbacks
dirtyCallbacks.markStaticDirty = markStaticDirty
dirtyCallbacks.markInteractiveDirty = markInteractiveDirty

// Input interactions
const { cursorClass, spaceHeld, isPanning } = usePanning({
  canvasRef: interactiveCanvasRef,
  panBy,
  zoomBy,
  activeTool,
})

useDrawingInteraction({
  canvasRef: interactiveCanvasRef,
  activeTool,
  spaceHeld,
  isPanning,
  toScene,
  newElement,
  multiElement,
  elements,
  zoom,
  suggestedBindings,
  onElementCreated(el) {
    addElement(el)
    select(el.id)
    markInteractiveDirty()
  },
  markNewElementDirty,
  markStaticDirty,
  markInteractiveDirty,
})

const { cursorStyle } = useSelectionInteraction({
  canvasRef: interactiveCanvasRef,
  activeTool,
  spaceHeld,
  isPanning,
  zoom,
  toScene,
  elements,
  selectionBox,
  selectedElements: () => selectedElements.value,
  select,
  addToSelection,
  toggleSelection,
  clearSelection,
  selectAll,
  isSelected,
  markStaticDirty,
  markInteractiveDirty,
  setTool,
  editingLinearElement,
  onDoubleClickArrow(el: ExcalidrawArrowElement) {
    enterLinearEditor(el)
  },
})

const combinedCursorClass = computed(() => {
  // Panning cursor takes priority over selection cursor
  if (cursorClass.value !== 'cursor-default') return cursorClass.value
  // Multi-point mode → crosshair
  if (multiElement.value) return 'cursor-crosshair'
  // Linear editor mode → pointer for handles
  if (editingLinearElement.value) return 'cursor-pointer'
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
    <DrawingToolbar :model-value="activeTool" @update:model-value="setTool" />
  </div>
</template>
