import type { Theme } from '~/features/theme/types'

export const CODE_FONT_SIZE = 14
export const CODE_FONT_FAMILY = 'monospace'
export const CODE_LINE_HEIGHT = 1.5
export const CODE_CHAR_WIDTH = 8.4 // approximate monospace char width at 14px

export const CODE_PADDING = {
  top: 36, // header bar height
  left: 52, // gutter for line numbers
  right: 16,
  bottom: 16,
} as const

export const CODE_BORDER_RADIUS = 8
export const CODE_MIN_WIDTH = 200
export const CODE_MIN_HEIGHT = 80

export const CODE_HEADER_DOT_RADIUS = 5
export const CODE_HEADER_DOT_GAP = 8
export const CODE_HEADER_DOT_LEFT = 16
export const CODE_HEADER_DOT_Y = 18

export const CODE_HEADER_DOT_COLORS = ['#ff5f57', '#febc2e', '#28c840'] as const

export const CODE_LANGUAGE_LABELS: Record<string, string> = {
  typescript: 'TypeScript',
  vue: 'Vue',
}

export const DEFAULT_CODE_LANGUAGE = 'typescript' as const

interface CodeThemeColors {
  bg: string
  headerBg: string
  headerText: string
  gutterText: string
  defaultText: string
}

export const CODE_THEME_COLORS: Record<Theme, CodeThemeColors> = {
  dark: {
    bg: '#1e1e2e',
    headerBg: '#181825',
    headerText: '#6c7086',
    gutterText: '#585b70',
    defaultText: '#cdd6f4',
  },
  light: {
    bg: '#fafafa',
    headerBg: '#f0f0f0',
    headerText: '#9ca0b0',
    gutterText: '#b4b8c8',
    defaultText: '#393a4c',
  },
}
