import { ref, computed } from "vue";
import type { ComputedRef, Ref } from "vue";
import { clamp } from "~/shared/math";
import type { GlobalPoint } from "~/shared/math";
import { screenToScene, sceneToScreen } from "../coords";
import type { Viewport } from "../coords";

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 30;

interface UseViewportReturn {
  scrollX: Ref<number>;
  scrollY: Ref<number>;
  zoom: Ref<number>;
  viewport: ComputedRef<Viewport>;
  toScene: (screenX: number, screenY: number) => GlobalPoint;
  toScreen: (sceneX: number, sceneY: number) => GlobalPoint;
  zoomTo: (newZoom: number, center?: GlobalPoint) => void;
  zoomBy: (delta: number, center?: GlobalPoint) => void;
  panBy: (dx: number, dy: number) => void;
}

export function useViewport(): UseViewportReturn {
  const scrollX = ref(0);
  const scrollY = ref(0);
  const zoom = ref(1);

  const viewport = computed<Viewport>(() => ({
    scrollX: scrollX.value,
    scrollY: scrollY.value,
    zoom: zoom.value,
  }));

  function toScene(screenX: number, screenY: number): GlobalPoint {
    return screenToScene(screenX, screenY, viewport.value);
  }

  function toScreen(sceneX: number, sceneY: number): GlobalPoint {
    return sceneToScreen(sceneX, sceneY, viewport.value);
  }

  function zoomTo(newZoom: number, center?: GlobalPoint): void {
    const clampedZoom = clamp(newZoom, MIN_ZOOM, MAX_ZOOM);

    if (center) {
      const scenePoint = screenToScene(center[0], center[1], viewport.value);
      scrollX.value = center[0] / clampedZoom - scenePoint[0];
      scrollY.value = center[1] / clampedZoom - scenePoint[1];
    }

    zoom.value = clampedZoom;
  }

  function zoomBy(delta: number, center?: GlobalPoint): void {
    zoomTo(zoom.value * (1 + delta), center);
  }

  function panBy(dx: number, dy: number): void {
    scrollX.value += dx / zoom.value;
    scrollY.value += dy / zoom.value;
  }

  return {
    scrollX,
    scrollY,
    zoom,
    viewport,
    toScene,
    toScreen,
    zoomTo,
    zoomBy,
    panBy,
  };
}
