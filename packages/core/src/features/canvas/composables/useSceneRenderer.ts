import { computed, watch } from "vue";
import type { Ref, ShallowRef, ComputedRef } from "vue";
import type { RoughCanvas } from "roughjs/bin/canvas";
import { useRenderer } from "./useRenderer";
import { useAnimationController } from "./useAnimationController";
import type { UseAnimationControllerReturn } from "./useAnimationController";
import { renderGrid } from "../../rendering/renderGrid";
import { renderScene } from "../../rendering/renderScene";
import { renderElement } from "../../rendering/renderElement";
import { renderInteractiveScene } from "../../rendering/renderInteractive";
import type {
  LinearEditorRenderState,
  MultiPointRenderState,
  EraserRenderState,
} from "../../rendering/renderInteractive";
import type {
  ExcalidrawElement,
  ExcalidrawLinearElement,
  ExcalidrawTextElement,
} from "../../elements/types";
import type { Box, GlobalPoint } from "../../../shared/math";
import { resolveColor } from "../../theme";
import type { Theme } from "../../theme";
import type { CodeElement } from "../../code";
import type { FileId, ImageCacheEntry } from "../../image/types";

interface UseSceneRendererOptions {
  layers: {
    staticCtx: ShallowRef<CanvasRenderingContext2D | null>;
    newElementCtx: ShallowRef<CanvasRenderingContext2D | null>;
    interactiveCtx: ShallowRef<CanvasRenderingContext2D | null>;
    staticRc: ShallowRef<RoughCanvas | null>;
    newElementRc: ShallowRef<RoughCanvas | null>;
  };
  canvasRefs: {
    staticCanvasRef: Readonly<Ref<HTMLCanvasElement | null>>;
    newElementCanvasRef: Readonly<Ref<HTMLCanvasElement | null>>;
    interactiveCanvasRef: Readonly<Ref<HTMLCanvasElement | null>>;
  };
  viewport: {
    scrollX: Ref<number>;
    scrollY: Ref<number>;
    zoom: Ref<number>;
    width: Ref<number>;
    height: Ref<number>;
  };
  elements: ShallowRef<readonly ExcalidrawElement[]>;
  selectedElements: ComputedRef<ExcalidrawElement[]>;
  selectedIds: ShallowRef<ReadonlySet<string>>;
  newElement: Ref<ExcalidrawElement | null>;
  selectionBox: ShallowRef<Box | null>;
  // Linear editor state
  editingLinearElement?: ShallowRef<ExcalidrawLinearElement | null>;
  editingPointIndices?: ShallowRef<ReadonlySet<number>>;
  editingHoveredMidpoint?: ShallowRef<number | null>;
  // Multi-point creation state
  multiElement?: ShallowRef<ExcalidrawLinearElement | null>;
  lastCursorPoint?: ShallowRef<GlobalPoint | null>;
  // Binding highlights
  suggestedBindings?: ShallowRef<readonly ExcalidrawElement[]>;
  // Midpoint hover for selection-mode handles
  hoveredMidpoint?: ShallowRef<{ elementId: string; segmentIndex: number } | null>;
  // Group selection
  selectedGroupIds?: ShallowRef<ReadonlySet<string>>;
  // Text editing — hide element being edited (textarea overlay replaces canvas-drawn text)
  editingTextElement?: ShallowRef<ExcalidrawTextElement | null>;
  // Code editing — hide element being edited (editor overlay replaces canvas-drawn code)
  editingCodeElement?: ShallowRef<CodeElement | null>;
  // Eraser state — trail points and pending erasure IDs
  eraserTrailPoints?: ShallowRef<readonly GlobalPoint[]>;
  pendingErasureIds?: ShallowRef<ReadonlySet<string>>;
  // Theme and image cache — injected from outside
  theme: Ref<Theme>;
  imageCache: ShallowRef<Map<FileId, ImageCacheEntry>>;
}

interface UseSceneRendererReturn {
  markStaticDirty: () => void;
  markNewElementDirty: () => void;
  markInteractiveDirty: () => void;
  animations: UseAnimationControllerReturn;
}

function buildLinearEditorState(
  editingElement: ShallowRef<ExcalidrawLinearElement | null> | undefined,
  pointIndices: ShallowRef<ReadonlySet<number>> | undefined,
  hoveredMidpoint: ShallowRef<number | null> | undefined,
): LinearEditorRenderState | null {
  const el = editingElement?.value;
  if (!el) return null;

  return {
    element: el,
    selectedPointIndices: pointIndices?.value ?? new Set(),
    hoveredMidpointIndex: hoveredMidpoint?.value ?? null,
  };
}

function buildMultiPointState(
  multiElement: ShallowRef<ExcalidrawLinearElement | null> | undefined,
  lastCursorPoint: ShallowRef<GlobalPoint | null> | undefined,
): MultiPointRenderState | null {
  const el = multiElement?.value;
  const cursor = lastCursorPoint?.value;
  if (!el || !cursor) return null;

  return { element: el, cursorPoint: cursor };
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
    hoveredMidpoint,
    selectedGroupIds,
    editingTextElement,
    editingCodeElement,
    eraserTrailPoints,
    pendingErasureIds,
    theme,
    imageCache,
  } = options;
  const { scrollX, scrollY, zoom, width, height } = viewport;

  const CANVAS_BG = "#ffffff";
  const bgColor = computed(() => resolveColor(CANVAS_BG, theme.value));

  const { markStaticDirty, markNewElementDirty, markInteractiveDirty, markAllDirty } = useRenderer({
    staticLayer: { ctx: layers.staticCtx, canvas: canvasRefs.staticCanvasRef },
    newElementLayer: { ctx: layers.newElementCtx, canvas: canvasRefs.newElementCanvasRef },
    interactiveLayer: { ctx: layers.interactiveCtx, canvas: canvasRefs.interactiveCanvasRef },
    width,
    height,
    scrollX,
    scrollY,
    zoom,
    bgColor,
    onRenderStatic(ctx) {
      renderGrid(
        ctx,
        scrollX.value,
        scrollY.value,
        zoom.value,
        width.value,
        height.value,
        theme.value,
      );
      const rc = layers.staticRc.value;
      if (rc) {
        const editingTextId = editingTextElement?.value?.id;
        const editingCodeId = editingCodeElement?.value?.id;
        const hiddenId = editingTextId ?? editingCodeId;
        const visibleElements = hiddenId
          ? elements.value.filter((el) => el.id !== hiddenId)
          : elements.value;
        renderScene(
          ctx,
          rc,
          visibleElements,
          scrollX.value,
          scrollY.value,
          zoom.value,
          width.value,
          height.value,
          theme.value,
          imageCache.value,
        );
      }
    },
    onRenderNewElement(ctx) {
      const el = newElement.value;
      const rc = layers.newElementRc.value;
      if (!el || !rc) return;
      ctx.save();
      ctx.scale(zoom.value, zoom.value);
      ctx.translate(scrollX.value, scrollY.value);
      renderElement(ctx, rc, el, theme.value, imageCache.value, zoom.value);
      ctx.restore();
    },
    onRenderInteractive(ctx) {
      ctx.save();
      ctx.scale(zoom.value, zoom.value);
      ctx.translate(scrollX.value, scrollY.value);

      const eraserState: EraserRenderState | null = eraserTrailPoints?.value.length
        ? {
            trailPoints: eraserTrailPoints.value,
            pendingIds: pendingErasureIds?.value ?? new Set(),
          }
        : null;

      renderInteractiveScene({
        ctx,
        selectedElements: selectedElements.value,
        elements: elements.value,
        zoom: zoom.value,
        selectionBox: selectionBox.value,
        theme: theme.value,
        linearEditorState: buildLinearEditorState(
          editingLinearElement,
          editingPointIndices,
          editingHoveredMidpoint,
        ),
        multiPointState: buildMultiPointState(multiElement, lastCursorPoint),
        suggestedBindings: suggestedBindings?.value ?? null,
        selectedGroupIds: selectedGroupIds?.value,
        hoveredMidpoint: hoveredMidpoint?.value ?? null,
        eraserState,
      });
      ctx.restore();
    },
  });

  const animations = useAnimationController({ markInteractiveDirty });

  watch(selectedIds, markInteractiveDirty);
  watch(theme, markAllDirty);

  return { markStaticDirty, markNewElementDirty, markInteractiveDirty, animations };
}
