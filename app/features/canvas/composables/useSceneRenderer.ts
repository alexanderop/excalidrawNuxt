import { watch } from 'vue'
import type { Ref, ShallowRef, ComputedRef } from 'vue'
import type { RoughCanvas } from 'roughjs/bin/canvas'
import { useRenderer } from './useRenderer'
import { renderGrid } from '~/features/rendering/renderGrid'
import { renderScene } from '~/features/rendering/renderScene'
import { renderElement } from '~/features/rendering/renderElement'
import { renderInteractiveScene } from '~/features/rendering/renderInteractive'
import type { ExcalidrawElement } from '~/features/elements/types'
import type { Box } from '~/shared/math'

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
}

interface UseSceneRendererReturn {
  markStaticDirty: () => void
  markNewElementDirty: () => void
  markInteractiveDirty: () => void
}

export function useSceneRenderer(options: UseSceneRendererOptions): UseSceneRendererReturn {
  const { layers, canvasRefs, viewport, elements, selectedElements, selectedIds, newElement, selectionBox } = options
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
        renderScene(ctx, rc, elements.value, scrollX.value, scrollY.value, zoom.value)
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
      )
      ctx.restore()
    },
  })

  watch(selectedIds, () => {
    markInteractiveDirty()
  })

  return { markStaticDirty, markNewElementDirty, markInteractiveDirty }
}
