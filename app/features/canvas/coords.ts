import { pointFrom } from '@excalidraw/math'
import type { GlobalPoint } from '@excalidraw/math'

export interface Viewport {
  scrollX: number
  scrollY: number
  zoom: number
}

export function screenToScene(screenX: number, screenY: number, viewport: Viewport): GlobalPoint {
  return pointFrom<GlobalPoint>(
    screenX / viewport.zoom - viewport.scrollX,
    screenY / viewport.zoom - viewport.scrollY,
  )
}

export function sceneToScreen(sceneX: number, sceneY: number, viewport: Viewport): GlobalPoint {
  return pointFrom<GlobalPoint>(
    (sceneX + viewport.scrollX) * viewport.zoom,
    (sceneY + viewport.scrollY) * viewport.zoom,
  )
}
