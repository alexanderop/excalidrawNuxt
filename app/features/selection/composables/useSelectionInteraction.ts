import { shallowRef } from 'vue'
import type { Ref, ShallowRef } from 'vue'
import { useEventListener } from '@vueuse/core'
import type { ExcalidrawElement } from '~/features/elements/types'
import { mutateElement } from '~/features/elements/mutateElement'
import type { Box, Point } from '~/shared/math'
import type { ToolType } from '~/features/tools/types'
import { hitTest, getElementAtPosition } from '../hitTest'
import { getTransformHandleAtPosition } from '../transformHandles'
import type { TransformHandleType, TransformHandleDirection } from '../transformHandles'
import { startDrag, continueDrag } from '../dragElements'
import type { DragState } from '../dragElements'
import { resizeElement } from '../resizeElement'
import type { ResizeState } from '../resizeElement'
import { getElementBounds } from '../bounds'
import type { Bounds } from '../bounds'

type InteractionState =
  | { type: 'idle' }
  | { type: 'dragging'; dragState: DragState }
  | { type: 'resizing'; resizeState: ResizeState }
  | { type: 'boxSelecting'; startPoint: Point }

interface UseSelectionInteractionReturn {
  selectionBox: ShallowRef<Box | null>
  cursorStyle: ShallowRef<string>
}

interface UseSelectionInteractionOptions {
  canvasRef: Readonly<Ref<HTMLCanvasElement | null>>
  activeTool: ShallowRef<ToolType>
  spaceHeld: Ref<boolean>
  isPanning: Ref<boolean>
  zoom: Ref<number>
  toScene: (screenX: number, screenY: number) => Point
  elements: ShallowRef<readonly ExcalidrawElement[]>
  selectedElements: () => readonly ExcalidrawElement[]
  select: (id: string) => void
  addToSelection: (id: string) => void
  toggleSelection: (id: string) => void
  clearSelection: (this: void) => void
  selectAll: (this: void) => void
  isSelected: (id: string) => boolean
  markStaticDirty: () => void
  markInteractiveDirty: () => void
  setTool: (tool: ToolType) => void
  selectionBox?: ShallowRef<Box | null>
}

export function useSelectionInteraction(options: UseSelectionInteractionOptions): UseSelectionInteractionReturn {
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
    selectAll,
    isSelected,
    markStaticDirty,
    markInteractiveDirty,
    setTool,
  } = options

  let interaction: InteractionState = { type: 'idle' }

  const selectionBox = options.selectionBox ?? shallowRef<Box | null>(null)
  const cursorStyle = shallowRef('default')

  function tryStartResize(scenePoint: Point, e: PointerEvent): boolean {
    const selected = selectedElements()
    if (selected.length !== 1) return false

    const el = selected[0]!
    const handleType = getTransformHandleAtPosition(scenePoint, el, zoom.value)
    if (!handleType || handleType === 'rotation') return false

    interaction = {
      type: 'resizing',
      resizeState: {
        handleType: handleType satisfies TransformHandleDirection,
        originalBounds: { x: el.x, y: el.y, width: el.width, height: el.height },
        origin: scenePoint,
      },
    }
    canvasRef.value?.setPointerCapture(e.pointerId)
    return true
  }

  function tryStartDrag(scenePoint: Point, e: PointerEvent): boolean {
    const hitElement = getElementAtPosition(scenePoint, elements.value, zoom.value)
    if (!hitElement) return false

    if (e.shiftKey) {
      toggleSelection(hitElement.id)
    }
    if (!e.shiftKey && !isSelected(hitElement.id)) {
      select(hitElement.id)
    }

    interaction = {
      type: 'dragging',
      dragState: startDrag(scenePoint, selectedElements()),
    }
    canvasRef.value?.setPointerCapture(e.pointerId)
    markInteractiveDirty()
    return true
  }

  function handlePointerDown(e: PointerEvent): void {
    if (spaceHeld.value || isPanning.value) return
    if (activeTool.value !== 'selection') return
    if (e.button !== 0) return

    const scenePoint = toScene(e.offsetX, e.offsetY)

    if (tryStartResize(scenePoint, e)) return
    if (tryStartDrag(scenePoint, e)) return

    // Clicked empty space → start box selecting
    if (!e.shiftKey) {
      clearSelection()
    }
    interaction = {
      type: 'boxSelecting',
      startPoint: scenePoint,
    }
    canvasRef.value?.setPointerCapture(e.pointerId)
    markInteractiveDirty()
  }

  function handlePointerMove(e: PointerEvent): void {
    const scenePoint = toScene(e.offsetX, e.offsetY)

    if (interaction.type === 'idle') {
      updateCursor(scenePoint)
      return
    }

    if (interaction.type === 'dragging') {
      continueDrag(scenePoint, interaction.dragState, selectedElements())
      markStaticDirty()
      markInteractiveDirty()
      return
    }

    if (interaction.type === 'resizing') {
      const selected = selectedElements()
      if (selected.length !== 1) return
      resizeElement(scenePoint, interaction.resizeState, selected[0]!, e.shiftKey)
      markStaticDirty()
      markInteractiveDirty()
      return
    }

    if (interaction.type === 'boxSelecting') {
      const box = normalizeBox(interaction.startPoint, scenePoint)
      selectionBox.value = box
      selectElementsInBox(box)
      markInteractiveDirty()
    }
  }

  function handlePointerUp(e: PointerEvent): void {
    canvasRef.value?.releasePointerCapture(e.pointerId)

    if (interaction.type === 'boxSelecting') {
      selectionBox.value = null
      markInteractiveDirty()
    }

    if (interaction.type === 'dragging' || interaction.type === 'resizing') {
      markStaticDirty()
      markInteractiveDirty()
    }

    interaction = { type: 'idle' }
  }

  function updateCursor(scenePoint: Point): void {
    if (activeTool.value !== 'selection') return

    const selected = selectedElements()

    // Check transform handles
    for (const el of selected) {
      const handleType = getTransformHandleAtPosition(scenePoint, el, zoom.value)
      if (handleType) {
        cursorStyle.value = getResizeCursor(handleType)
        return
      }
    }

    // Check selected element hover → move cursor
    for (const el of selected) {
      if (hitTest(scenePoint, el, zoom.value)) {
        cursorStyle.value = 'move'
        return
      }
    }

    cursorStyle.value = 'default'
  }

  function selectElementsInBox(box: Box): void {
    const boxBounds: Bounds = [box.x, box.y, box.x + box.width, box.y + box.height]
    const ids: string[] = []

    for (const el of elements.value) {
      if (el.isDeleted) continue
      const [ex1, ey1, ex2, ey2] = getElementBounds(el)
      // Fully enclosed check
      if (ex1 >= boxBounds[0] && ey1 >= boxBounds[1] && ex2 <= boxBounds[2] && ey2 <= boxBounds[3]) {
        ids.push(el.id)
      }
    }

    clearSelection()
    for (const id of ids) {
      options.addToSelection(id)
    }
  }

  function handleKeyDown(e: KeyboardEvent): void {
    if (activeTool.value !== 'selection') return

    const selected = selectedElements()

    if (e.key === 'Delete' || e.key === 'Backspace') {
      for (const el of selected) {
        mutateElement(el, { isDeleted: true })
      }
      clearSelection()
      markStaticDirty()
      markInteractiveDirty()
      return
    }

    if (e.key === 'Escape') {
      clearSelection()
      setTool('selection')
      markInteractiveDirty()
      return
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
      e.preventDefault()
      selectAll()
      markInteractiveDirty()
      return
    }

    handleArrowKey(e, selected)
  }

  function handleArrowKey(e: KeyboardEvent, selected: readonly ExcalidrawElement[]): void {
    const step = e.shiftKey ? 10 : 1
    const arrowDeltas: Record<string, Point> = {
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
    }

    const delta = arrowDeltas[e.key]
    if (!delta) return
    if (selected.length === 0) return

    e.preventDefault()
    for (const el of selected) {
      mutateElement(el, {
        x: el.x + delta.x,
        y: el.y + delta.y,
      })
    }
    markStaticDirty()
    markInteractiveDirty()
  }

  useEventListener(canvasRef, 'pointerdown', handlePointerDown)
  useEventListener(canvasRef, 'pointermove', handlePointerMove)
  useEventListener(canvasRef, 'pointerup', handlePointerUp)

  if (typeof document !== 'undefined') {
    useEventListener(document, 'keydown', handleKeyDown)
  }

  return {
    selectionBox,
    cursorStyle,
  }
}

function normalizeBox(start: Point, end: Point): Box {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  }
}

const RESIZE_CURSORS: Record<TransformHandleDirection, string> = {
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
  nw: 'nwse-resize',
  se: 'nwse-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
}

function getResizeCursor(handleType: TransformHandleType): string {
  if (handleType === 'rotation') return 'grab'
  return RESIZE_CURSORS[handleType]
}
