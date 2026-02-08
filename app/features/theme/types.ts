export type Theme = 'light' | 'dark'

export const THEME = { LIGHT: 'light', DARK: 'dark' } as const satisfies Record<string, Theme>
