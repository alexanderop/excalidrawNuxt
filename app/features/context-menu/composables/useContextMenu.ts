import { ref, computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import { useEventListener, onKeyStroke } from '@vueuse/core'
import type { ContextMenuType, ContextMenuItem, ContextMenuContext } from '../types'
import { isSeparator } from '../types'
import { elementMenuItems, canvasMenuItems } from '../contextMenuItems'

interface UseContextMenuOptions {
  context: () => ContextMenuContext
}

interface UseContextMenuReturn {
  isOpen: Ref<boolean>
  position: Ref<{ x: number; y: number }>
  menuType: Ref<ContextMenuType>
  filteredItems: ComputedRef<ContextMenuItem[]>
  open: (event: PointerEvent | MouseEvent, type: ContextMenuType) => void
  close: () => void
}

export function useContextMenu(options: UseContextMenuOptions): UseContextMenuReturn {
  const { context } = options

  const isOpen = ref(false)
  const position = ref({ x: 0, y: 0 })
  const menuType = ref<ContextMenuType>('canvas')

  const filteredItems = computed(() => {
    const items = menuType.value === 'element' ? elementMenuItems : canvasMenuItems
    const ctx = context()
    return items.filter((item) => {
      if (isSeparator(item)) return true
      if (!item.predicate) return true
      return item.predicate(ctx)
    })
  })

  function open(event: PointerEvent | MouseEvent, type: ContextMenuType): void {
    event.preventDefault()
    position.value = { x: event.clientX, y: event.clientY }
    menuType.value = type
    isOpen.value = true
  }

  function close(): void {
    if (!isOpen.value) return
    isOpen.value = false
  }

  // Close on Escape
  onKeyStroke('Escape', close)

  // Close on scroll/wheel
  useEventListener('wheel', close, { passive: true })

  return {
    isOpen,
    position,
    menuType,
    filteredItems,
    open,
    close,
  }
}
