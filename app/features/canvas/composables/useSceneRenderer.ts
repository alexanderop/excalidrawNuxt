import { watch } from 'vue'
import type { Ref, ShallowRef, ComputedRef } from 'vue'
import type { RoughCanvas } from 'roughjs/bin/canvas'
import { useRenderer } from './useRenderer'
import { useAnimationController } from './useAnimationController'
import type { UseAnimationControllerReturn } from './useAnimationController'
import { renderGrid } from '~/features/rendering/renderGrid'
import { renderScene } from '~/features/rendering/renderScene'
import { renderElement } from '~/features/rendering/renderElement'
import { renderInteractiveScene } from '~/features/rendering/renderInteractive'
import type { LinearEditorRenderState, MultiPointRenderState } from '~/features/rendering/renderInteractive'
import type { ExcalidrawElement, ExcalidrawArrowElement } from '~/features/elements/types'
import type { Box, Point } from '~/shared/math'

interface UseSceneRendererOptions {
  layers: {
    staticCtx: ShallowRef<CanvasRenderingContext2D | null>
    newElementCtx: ShallowRef<CanvasRenderingContext2D | null>
    interactiveCtx: ShallowRef<CanvasRenderingContext2D | null>
    staticRc: ShallowRef<RoughCanvas | null>
    newElementRc: ShallowRef<RoughCanvas | null>
  }
  canvasRefs: {
    staticCanvasRef: Readonly<Ref<HTMLCanvasElement | null>>
    newElementCanvasRef: Readonly<Ref<HTMLCanvasElement | null>>
    interactiveCanvasRef: Readonly<Ref<HTMLCanvasElement | null>>
  }
  viewport: {
    scrollX: Ref<number>
    scrollY: Ref<number>
    zoom: Ref<number>
    width: Ref<number>
    height: Ref<number>
  }
  elements: ShallowRef<readonly ExcalidrawElement[]>
  selectedElements: ComputedRef<ExcalidrawElement[]>
  selectedIds: ShallowRef<ReadonlySet<string>>
  newElement: ShallowRef<ExcalidrawElement | null>
  selectionBox: ShallowRef<Box | null>
  // Linear editor state
  editingLinearElement?: ShallowRef<ExcalidrawArrowElement | null>
  editingPointIndices?: ShallowRef<ReadonlySet<number>>
  editingHoveredMidpoint?: ShallowRef<number | null>
  // Multi-point creation state
  multiElement?: ShallowRef<ExcalidrawArrowElement | null>
  lastCursorPoint?: ShallowRef<Point | null>
  // Binding highlights
  suggestedBindings?: ShallowRef<readonly ExcalidrawElement[]>
}

interface UseSceneRendererReturn {
  markStaticDirty: () => void
  markNewElementDirty: () => void
  markInteractiveDirty: () => void
  animations: UseAnimationControllerReturn
}

function buildLinearEditorState(
  editingElement: ShallowRef<ExcalidrawArrowElement | null> | undefined,
  pointIndices: ShallowRef<ReadonlySet<number>> | undefined,
  hoveredMidpoint: ShallowRef<number | null> | undefined,
): LinearEditorRenderState | null {
  const el = editingElement?.value
  if (!el) return null

  return {
    element: el,
    selectedPointIndices: pointIndices?.value ?? new Set(),
    hoveredMidpointIndex: hoveredMidpoint?.value ?? null,
  }
}

function buildMultiPointState(
  multiElement: ShallowRef<ExcalidrawArrowElement | null> | undefined,
  lastCursorPoint: ShallowRef<Point | null> | undefined,
): MultiPointRenderState | null {
  const el = multiElement?.value
  const cursor = lastCursorPoint?.value
  if (!el || !cursor) return null

  return { element: el, cursorPoint: cursor }
}

/**
 * Orchestrates rendering across the three canvas layers: static, new-element, and interactive.
 *
 * Delegates the actual render-loop scheduling (rAF batching, dirty-flag diffing) to
 * {@link useRenderer} and wires up domain-specific paint callbacks for each layer:
 *
 * - **Static layer** — grid + all committed scene elements (roughjs shapes).
 * - **New-element layer** — the single element currently being drawn by the user.
 * - **Interactive layer** — selection boxes, selected-element handles, linear-editor
 *   control points, multi-point arrow cursor preview, and binding highlights.
 *
 * Returns three `mark*Dirty` functions that callers (tools, event handlers, etc.)
 * invoke to schedule a repaint of the corresponding layer on the next animation frame.
 *
 * Also auto-marks the interactive layer dirty whenever `selectedIds` changes.
 */
export function useSceneRenderer(options: UseSceneRendererOptions): UseSceneRendererReturn {
  const {
    layers,
    canvasRefs,
    viewport,
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
  } = options
  const { scrollX, scrollY, zoom, width, height } = viewport

  const { markStaticDirty, markNewElementDirty, markInteractiveDirty } = useRenderer({
    staticLayer: { ctx: layers.staticCtx, canvas: canvasRefs.staticCanvasRef },
    newElementLayer: { ctx: layers.newElementCtx, canvas: canvasRefs.newElementCanvasRef },
    interactiveLayer: { ctx: layers.interactiveCtx, canvas: canvasRefs.interactiveCanvasRef },
    width,
    height,
    scrollX,
    scrollY,
    zoom,
    onRenderStatic(ctx) {
      renderGrid(ctx, scrollX.value, scrollY.value, zoom.value, width.value, height.value)
      const rc = layers.staticRc.value
      if (rc) {
        renderScene(ctx, rc, elements.value, scrollX.value, scrollY.value, zoom.value, width.value, height.value)
      }
    },
    onRenderNewElement(ctx) {
      const el = newElement.value
      const rc = layers.newElementRc.value
      if (!el || !rc) return
      ctx.save()
      ctx.scale(zoom.value, zoom.value)
      ctx.translate(scrollX.value, scrollY.value)
      renderElement(ctx, rc, el)
      ctx.restore()
    },
    onRenderInteractive(ctx) {
      ctx.save()
      ctx.scale(zoom.value, zoom.value)
      ctx.translate(scrollX.value, scrollY.value)

      renderInteractiveScene(
        ctx,
        selectedElements.value,
        zoom.value,
        selectionBox.value,
        buildLinearEditorState(editingLinearElement, editingPointIndices, editingHoveredMidpoint),
        buildMultiPointState(multiElement, lastCursorPoint),
        suggestedBindings?.value ?? null,
      )
      ctx.restore()
    },
  })

  const animations = useAnimationController({ markInteractiveDirty })

  watch(selectedIds, markInteractiveDirty)

  return { markStaticDirty, markNewElementDirty, markInteractiveDirty, animations }
}
