import type { Theme } from '../theme/types'

export const HANDLE_SIZE = 8
export const HANDLE_MARGIN = 4
export const ROTATION_HANDLE_OFFSET = 20

export const SELECTION_LINE_WIDTH = 1
export const SELECTION_PADDING = 4

export const MIN_ELEMENT_SIZE = 1

export const SELECTION_COLORS: Record<Theme, {
  selection: string
  selectionFill: string
  handleFill: string
  handleStroke: string
}> = {
  light: {
    selection: '#4a90d9',
    selectionFill: 'rgba(74, 144, 217, 0.1)',
    handleFill: '#ffffff',
    handleStroke: '#4a90d9',
  },
  dark: {
    selection: 'rgba(3, 93, 161, 1)',
    selectionFill: 'rgba(3, 93, 161, 0.15)',
    handleFill: '#1e1e1e',
    handleStroke: 'rgba(3, 93, 161, 1)',
  },
}
