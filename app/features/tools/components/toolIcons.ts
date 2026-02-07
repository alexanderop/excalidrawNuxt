import type { ToolType } from '../types'

interface ToolIconDef {
  viewBox: string
  paths: string
}

export const TOOL_ICONS: Record<ToolType, ToolIconDef> = {
  selection: {
    viewBox: '0 0 22 22',
    paths: `<g stroke="currentColor" stroke-width="1.25" fill="none">
      <path d="M4.5 2.5L4.5 18.5L9.5 13.5L14.5 13.5Z" stroke-linecap="round" stroke-linejoin="round"/>
    </g>`,
  },
  hand: {
    viewBox: '0 0 24 24',
    paths: `<g stroke="currentColor" stroke-width="1.25" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M8 13V5.5C8 4.67 8.67 4 9.5 4S11 4.67 11 5.5V11"/>
      <path d="M11 5.5C11 4.67 11.67 4 12.5 4S14 4.67 14 5.5V11"/>
      <path d="M14 6.5C14 5.67 14.67 5 15.5 5S17 5.67 17 6.5V11"/>
      <path d="M17 8.5C17 7.67 17.67 7 18.5 7S20 7.67 20 8.5V15C20 18.87 16.87 22 13 22H12C9.24 22 6.73 20.54 5.32 18.18L4.12 16.16C3.65 15.36 3.88 14.33 4.64 13.8C5.26 13.37 6.1 13.38 6.7 13.84L8 14.82"/>
    </g>`,
  },
  rectangle: {
    viewBox: '0 0 24 24',
    paths: `<g stroke="currentColor" stroke-width="1.5" fill="none">
      <rect x="3" y="4" width="18" height="16" rx="2" ry="2"/>
    </g>`,
  },
  diamond: {
    viewBox: '0 0 24 24',
    paths: `<g stroke="currentColor" stroke-width="1.5" fill="none">
      <path d="M12 2L22 12L12 22L2 12Z" stroke-linejoin="round"/>
    </g>`,
  },
  ellipse: {
    viewBox: '0 0 24 24',
    paths: `<g stroke="currentColor" stroke-width="1.5" fill="none">
      <ellipse cx="12" cy="12" rx="10" ry="8"/>
    </g>`,
  },
}
