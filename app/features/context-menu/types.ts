import type { Component } from 'vue'
import type { ExcalidrawElement } from '~/features/elements/types'

export type ContextMenuType = 'element' | 'canvas'

export type ContextMenuContext = {
  selectedIds: ReadonlySet<string>
  selectedElements: readonly ExcalidrawElement[]
  hasGroups: boolean
  isMultiSelect: boolean
  markDirty: () => void
}

export type ContextMenuItemBase = {
  label: string
  shortcut?: string
  icon?: Component
  predicate?: (context: ContextMenuContext) => boolean
  action: (context: ContextMenuContext) => void
}

export type ContextMenuSeparator = { type: 'separator' }

export type ContextMenuItem = ContextMenuItemBase | ContextMenuSeparator

export function isSeparator(item: ContextMenuItem): item is ContextMenuSeparator {
  return 'type' in item && item.type === 'separator'
}
