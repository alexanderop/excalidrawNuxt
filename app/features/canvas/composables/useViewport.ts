import type { Point } from '~/shared/math'
import { clamp } from '~/shared/math'
import { screenToScene, sceneToScreen } from '../coords'
import type { Viewport } from '../coords'

const MIN_ZOOM = 0.1
const MAX_ZOOM = 30

export function useViewport() {
  const scrollX = ref(0)
  const scrollY = ref(0)
  const zoom = ref(1)

  const viewport = computed<Viewport>(() => ({
    scrollX: scrollX.value,
    scrollY: scrollY.value,
    zoom: zoom.value,
  }))

  function toScene(screenX: number, screenY: number): Point {
    return screenToScene(screenX, screenY, viewport.value)
  }

  function toScreen(sceneX: number, sceneY: number): Point {
    return sceneToScreen(sceneX, sceneY, viewport.value)
  }

  function zoomTo(newZoom: number, center?: Point) {
    const clampedZoom = clamp(newZoom, MIN_ZOOM, MAX_ZOOM)

    if (center) {
      const scenePoint = screenToScene(center.x, center.y, viewport.value)
      scrollX.value = center.x / clampedZoom - scenePoint.x
      scrollY.value = center.y / clampedZoom - scenePoint.y
    }

    zoom.value = clampedZoom
  }

  function zoomBy(delta: number, center?: Point) {
    zoomTo(zoom.value * (1 + delta), center)
  }

  function panBy(dx: number, dy: number) {
    scrollX.value += dx / zoom.value
    scrollY.value += dy / zoom.value
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
  }
}
