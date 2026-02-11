import type { Ref } from 'vue'
import { ref } from 'vue'
import { createGlobalState } from '@vueuse/core'

export interface ActionEntry {
  id: string
  handler: () => void
}

interface CommandPaletteState {
  isOpen: Ref<boolean>
  registerActions: (entries: ActionEntry[]) => void
  execute: (id: string) => void
}

export const useCommandPalette = createGlobalState((): CommandPaletteState => {
  const isOpen = ref(false)
  const actionRegistry = new Map<string, () => void>()

  function registerActions(entries: ActionEntry[]): void {
    for (const entry of entries) {
      actionRegistry.set(entry.id, entry.handler)
    }
  }

  function execute(id: string): void {
    const handler = actionRegistry.get(id)
    if (handler) {
      handler()
    }
    isOpen.value = false
  }

  return { isOpen, registerActions, execute }
})
