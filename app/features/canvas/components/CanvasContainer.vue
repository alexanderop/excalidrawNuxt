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
import type { ExcalidrawElement } from '~/features/elements/types'
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
const { activeTool, setTool } = useTool()
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

// Canvas layers (contexts + RoughCanvas init)
const { staticCtx, newElementCtx, interactiveCtx, staticRc, newElementRc } = useCanvasLayers({
  staticCanvasRef,
  newElementCanvasRef,
  interactiveCanvasRef,
})

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
})

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
  onElementCreated(el) {
    addElement(el)
    select(el.id)
    markInteractiveDirty()
  },
  markNewElementDirty,
  markStaticDirty,
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
})

const combinedCursorClass = computed(() => {
  // Panning cursor takes priority over selection cursor
  if (cursorClass.value !== 'cursor-default') return cursorClass.value
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
      class="absolute inset-0 z-[2]"
    />
    <DrawingToolbar
      :active-tool="activeTool"
      :on-set-tool="setTool"
    />
  </div>
</template>
