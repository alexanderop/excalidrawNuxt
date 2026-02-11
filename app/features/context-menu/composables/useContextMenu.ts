import { ref, computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type { ContextMenuType, ContextMenuContext } from '../types'
import { isSeparator } from '../types'
import { elementMenuItems, canvasMenuItems } from '../contextMenuItems'

interface UseContextMenuOptions {
  context: () => ContextMenuContext
}

interface NuxtUiMenuItem {
  label?: string
  type?: 'separator'
  kbds?: string[]
  onSelect?: (e: Event) => void
}

interface UseContextMenuReturn {
  menuType: Ref<ContextMenuType>
  items: ComputedRef<NuxtUiMenuItem[]>
}

export function useContextMenu(options: UseContextMenuOptions): UseContextMenuReturn {
  const { context } = options

  const menuType = ref<ContextMenuType>('canvas')

  const items = computed<NuxtUiMenuItem[]>(() => {
    const rawItems = menuType.value === 'element' ? elementMenuItems : canvasMenuItems
    const ctx = context()

    return rawItems
      .filter((item) => {
        if (isSeparator(item)) return true
        if (!item.predicate) return true
        return item.predicate(ctx)
      })
      .map((item) => {
        if (isSeparator(item)) return { type: 'separator' as const }
        return {
          label: item.label,
          kbds: item.kbds,
          onSelect: () => item.action(ctx),
        }
      })
  })

  return {
    menuType,
    items,
  }
}
