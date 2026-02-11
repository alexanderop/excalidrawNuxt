import { computed, watchEffect, type Ref } from 'vue'
import { createGlobalState, useLocalStorage, useActiveElement, useEventListener } from '@vueuse/core'
import { THEME } from './types'
import type { Theme } from './types'
import { isTypingElement } from '~/shared/isTypingElement'

export const useTheme = createGlobalState(() => {
  const theme: Ref<Theme> = useLocalStorage<Theme>('excalidraw-theme', THEME.LIGHT)
  const isDark = computed(() => theme.value === THEME.DARK)

  const activeElement = useActiveElement()

  function toggleTheme(): void {
    theme.value = theme.value === THEME.LIGHT ? THEME.DARK : THEME.LIGHT
  }

  // Keyboard shortcut: Alt+Shift+D
  if (typeof document !== 'undefined') {
    useEventListener(document, 'keydown', (e: KeyboardEvent) => {
      if (isTypingElement(activeElement.value)) return
      if (e.altKey && e.shiftKey && e.code === 'KeyD') {
        e.preventDefault()
        toggleTheme()
      }
    })

    watchEffect(() => {
      document.documentElement.classList.toggle('dark', theme.value === THEME.DARK)
    })
  }

  function $reset(): void { theme.value = THEME.LIGHT }

  return { theme, isDark, toggleTheme, $reset }
})
