import { shallowRef, markRaw, onMounted } from "vue";
import type { Ref, ShallowRef } from "vue";
import rough from "roughjs";
import type { RoughCanvas } from "roughjs/bin/canvas";

interface UseCanvasLayersOptions {
  staticCanvasRef: Readonly<Ref<HTMLCanvasElement | null>>;
  newElementCanvasRef: Readonly<Ref<HTMLCanvasElement | null>>;
  interactiveCanvasRef: Readonly<Ref<HTMLCanvasElement | null>>;
}

interface UseCanvasLayersReturn {
  staticCtx: ShallowRef<CanvasRenderingContext2D | null>;
  newElementCtx: ShallowRef<CanvasRenderingContext2D | null>;
  interactiveCtx: ShallowRef<CanvasRenderingContext2D | null>;
  staticRc: ShallowRef<RoughCanvas | null>;
  newElementRc: ShallowRef<RoughCanvas | null>;
}

export function useCanvasLayers(options: UseCanvasLayersOptions): UseCanvasLayersReturn {
  const { staticCanvasRef, newElementCanvasRef, interactiveCanvasRef } = options;

  const staticCtx = shallowRef<CanvasRenderingContext2D | null>(null);
  const newElementCtx = shallowRef<CanvasRenderingContext2D | null>(null);
  const interactiveCtx = shallowRef<CanvasRenderingContext2D | null>(null);

  const staticRc = shallowRef<RoughCanvas | null>(null);
  const newElementRc = shallowRef<RoughCanvas | null>(null);

  function initCanvasContext(
    canvasRef: Readonly<Ref<HTMLCanvasElement | null>>,
    ctxRef: ShallowRef<CanvasRenderingContext2D | null>,
  ): void {
    const canvas = canvasRef.value;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) ctxRef.value = markRaw(ctx);
  }

  function initRoughCanvas(
    canvasRef: Readonly<Ref<HTMLCanvasElement | null>>,
    rcRef: ShallowRef<RoughCanvas | null>,
  ): void {
    const canvas = canvasRef.value;
    if (!canvas) return;
    rcRef.value = markRaw(rough.canvas(canvas));
  }

  onMounted(() => {
    initCanvasContext(staticCanvasRef, staticCtx);
    initCanvasContext(newElementCanvasRef, newElementCtx);
    initCanvasContext(interactiveCanvasRef, interactiveCtx);

    initRoughCanvas(staticCanvasRef, staticRc);
    initRoughCanvas(newElementCanvasRef, newElementRc);
  });

  return {
    staticCtx,
    newElementCtx,
    interactiveCtx,
    staticRc,
    newElementRc,
  };
}
