import { computed, type Ref } from 'vue'
import { createGlobalState, useLocalStorage, useActiveElement, useEventListener } from '@vueuse/core'
import { THEME } from './types'
import type { Theme } from './types'

export const useTheme = createGlobalState(() => {
  const theme: Ref<Theme> = useLocalStorage<Theme>('excalidraw-theme', THEME.LIGHT)
  const isDark = computed(() => theme.value === THEME.DARK)

  const activeElement = useActiveElement()

  function toggleTheme(): void {
    theme.value = theme.value === THEME.LIGHT ? THEME.DARK : THEME.LIGHT
  }

  function isTyping(): boolean {
    const el = activeElement.value
    if (!el) return false
    const tag = el.tagName
    return tag === 'INPUT' || tag === 'TEXTAREA'
  }

  // Keyboard shortcut: Alt+Shift+D
  if (typeof document !== 'undefined') {
    useEventListener(document, 'keydown', (e: KeyboardEvent) => {
      if (isTyping()) return
      if (e.altKey && e.shiftKey && e.code === 'KeyD') {
        e.preventDefault()
        toggleTheme()
      }
    })
  }

  function $reset(): void { theme.value = THEME.LIGHT }

  return { theme, isDark, toggleTheme, $reset }
})
