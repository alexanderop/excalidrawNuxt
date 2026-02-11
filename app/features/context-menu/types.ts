import type { ExcalidrawElement } from '~/features/elements/types'

export type ContextMenuType = 'element' | 'canvas'

export type ContextMenuContext = {
  selectedIds: ReadonlySet<string>
  selectedElements: readonly ExcalidrawElement[]
  hasGroups: boolean
  isMultiSelect: boolean
  markDirty: () => void
}

export type ContextMenuAction = {
  label: string
  kbds?: string[]
  predicate?: (context: ContextMenuContext) => boolean
  action: (context: ContextMenuContext) => void
}

export type ContextMenuSeparator = { type: 'separator' }

export type ContextMenuEntry = ContextMenuAction | ContextMenuSeparator

export function isSeparator(item: ContextMenuEntry): item is ContextMenuSeparator {
  return 'type' in item && item.type === 'separator'
}
