import type { ContextMenuItem } from './types'
import { useStyleClipboard } from '~/features/properties/composables/useStyleClipboard'

const separator: ContextMenuItem = { type: 'separator' }

export const elementMenuItems: readonly ContextMenuItem[] = [
  {
    label: 'Cut',
    shortcut: '⌘X',
    action: () => { /* stub: clipboard not yet implemented */ },
  },
  {
    label: 'Copy',
    shortcut: '⌘C',
    action: () => { /* stub: clipboard not yet implemented */ },
  },
  {
    label: 'Paste',
    shortcut: '⌘V',
    action: () => { /* stub: clipboard not yet implemented */ },
  },
  separator,
  {
    label: 'Copy styles',
    shortcut: '⌘⌥C',
    action: (ctx) => {
      if (ctx.selectedElements.length === 0) return
      const { copyStyles } = useStyleClipboard()
      copyStyles(ctx.selectedElements[0]!)
    },
  },
  {
    label: 'Paste styles',
    shortcut: '⌘⌥V',
    predicate: () => {
      const { hasStoredStyles } = useStyleClipboard()
      return hasStoredStyles.value
    },
    action: (ctx) => {
      const { pasteStyles } = useStyleClipboard()
      pasteStyles([...ctx.selectedElements], ctx.markDirty)
    },
  },
  separator,
  {
    label: 'Duplicate',
    shortcut: '⌘D',
    action: () => { /* stub: duplicate not yet implemented */ },
  },
  {
    label: 'Delete',
    shortcut: '⌫',
    action: () => { /* stub: delete via context menu not yet wired */ },
  },
  separator,
  {
    label: 'Bring to front',
    shortcut: '⌘⇧]',
    action: () => { /* stub: z-order not yet implemented */ },
  },
  {
    label: 'Bring forward',
    shortcut: '⌘]',
    action: () => { /* stub: z-order not yet implemented */ },
  },
  {
    label: 'Send backward',
    shortcut: '⌘[',
    action: () => { /* stub: z-order not yet implemented */ },
  },
  {
    label: 'Send to back',
    shortcut: '⌘⇧[',
    action: () => { /* stub: z-order not yet implemented */ },
  },
  separator,
  {
    label: 'Group',
    shortcut: '⌘G',
    action: () => { /* stub: group via context menu not yet wired */ },
  },
  {
    label: 'Ungroup',
    shortcut: '⌘⇧G',
    predicate: (ctx) => ctx.hasGroups,
    action: () => { /* stub: ungroup via context menu not yet wired */ },
  },
  separator,
  {
    label: 'Flip horizontal',
    shortcut: '⇧H',
    action: () => { /* stub: flip not yet implemented */ },
  },
  {
    label: 'Flip vertical',
    shortcut: '⇧V',
    action: () => { /* stub: flip not yet implemented */ },
  },
]

export const canvasMenuItems: readonly ContextMenuItem[] = [
  {
    label: 'Paste',
    shortcut: '⌘V',
    action: () => { /* stub: clipboard not yet implemented */ },
  },
  {
    label: 'Select all',
    shortcut: '⌘A',
    action: () => { /* stub: select all via context menu not yet wired */ },
  },
  separator,
  {
    label: 'Toggle grid',
    shortcut: "⌘'",
    action: () => { /* stub: grid toggle not yet implemented */ },
  },
]
