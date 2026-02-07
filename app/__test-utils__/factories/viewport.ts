import type { Viewport } from '~/features/canvas/coords'

export function createViewport(overrides: Partial<Viewport> = {}): Viewport {
  return { scrollX: 0, scrollY: 0, zoom: 1, ...overrides }
}
