import type { Point } from '~/shared/math'

export interface Viewport {
  scrollX: number
  scrollY: number
  zoom: number
}

export function screenToScene(screenX: number, screenY: number, viewport: Viewport): Point {
  return {
    x: screenX / viewport.zoom - viewport.scrollX,
    y: screenY / viewport.zoom - viewport.scrollY,
  }
}

export function sceneToScreen(sceneX: number, sceneY: number, viewport: Viewport): Point {
  return {
    x: (sceneX + viewport.scrollX) * viewport.zoom,
    y: (sceneY + viewport.scrollY) * viewport.zoom,
  }
}
