import type { Theme } from '../theme/types'

export const POINT_HANDLE_RADIUS = 5
export const MIDPOINT_HANDLE_RADIUS = 3
export const POINT_HIT_THRESHOLD = 10
export const MIDPOINT_HIT_THRESHOLD = 8

export const RUBBER_BAND_DASH = [4, 4] as const
export const RUBBER_BAND_WIDTH = 1

export const LINEAR_EDITOR_COLORS: Record<Theme, {
  pointFill: string
  pointStroke: string
  pointSelectedFill: string
  midpointFill: string
  midpointStroke: string
  rubberBand: string
}> = {
  light: {
    pointFill: '#ffffff',
    pointStroke: '#4a90d9',
    pointSelectedFill: '#4a90d9',
    midpointFill: '#ffffff',
    midpointStroke: '#4a90d9',
    rubberBand: '#4a90d9',
  },
  dark: {
    pointFill: '#1e1e1e',
    pointStroke: 'rgba(3, 93, 161, 1)',
    pointSelectedFill: 'rgba(3, 93, 161, 1)',
    midpointFill: '#1e1e1e',
    midpointStroke: 'rgba(3, 93, 161, 1)',
    rubberBand: 'rgba(3, 93, 161, 1)',
  },
}
