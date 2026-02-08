import type { Theme } from '~/features/theme'

/** Gap between arrow endpoint and shape edge (scene pixels) */
export const BASE_BINDING_GAP = 5

/** Max distance from shape edge to trigger binding (screen pixels, divide by zoom) */
export const BASE_BINDING_DISTANCE = 15

/** Minimum arrow diagonal to keep on creation (scene pixels) */
export const MINIMUM_ARROW_SIZE = 20

/** Highlight styling */
export const BINDING_HIGHLIGHT_LINE_WIDTH = 2
export const BINDING_HIGHLIGHT_PADDING = 6

export const BINDING_COLORS: Record<Theme, { highlight: string }> = {
  light: { highlight: '#4a90d9' },
  dark: { highlight: 'rgba(3, 93, 161, 1)' },
}
