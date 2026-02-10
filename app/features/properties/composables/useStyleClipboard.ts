import { ref, computed } from 'vue'
import { createGlobalState } from '@vueuse/core'
import type { ExcalidrawElement } from '~/features/elements/types'
import { isTextElement } from '~/features/elements/types'
import { mutateElement } from '~/features/elements/mutateElement'
import { useStyleDefaults } from './useStyleDefaults'

const STYLE_KEYS = [
  'strokeColor',
  'backgroundColor',
  'fillStyle',
  'strokeWidth',
  'strokeStyle',
  'opacity',
  'roughness',
  'roundness',
  'fontFamily',
  'fontSize',
  'textAlign',
] as const

type StyleKey = typeof STYLE_KEYS[number]

type StyleSnapshot = Partial<Record<StyleKey, unknown>>

const TEXT_ONLY_KEYS: ReadonlySet<StyleKey> = new Set([
  'fontFamily',
  'fontSize',
  'textAlign',
])

function buildUpdatesForElement(snapshot: StyleSnapshot, el: ExcalidrawElement): Record<string, unknown> {
  const updates: Record<string, unknown> = {}
  for (const key of STYLE_KEYS) {
    if (!(key in snapshot)) continue
    if (TEXT_ONLY_KEYS.has(key) && !isTextElement(el)) continue
    updates[key] = snapshot[key]
  }
  return updates
}

function syncDefaults(snapshot: StyleSnapshot): void {
  const defaults = useStyleDefaults()
  for (const key of STYLE_KEYS) {
    if (!(key in snapshot)) continue
    const defaultRef = defaults[key as keyof typeof defaults]
    if (defaultRef && 'value' in defaultRef) {
      (defaultRef as { value: unknown }).value = snapshot[key]
    }
  }
}

export const useStyleClipboard = createGlobalState(() => {
  const storedStyles = ref<StyleSnapshot | null>(null)

  const hasStoredStyles = computed(() => storedStyles.value !== null)

  function copyStyles(element: ExcalidrawElement): void {
    const snapshot: StyleSnapshot = {}
    const record = element as unknown as Record<string, unknown>
    for (const key of STYLE_KEYS) {
      if (key in record && record[key] !== undefined) {
        snapshot[key] = record[key]
      }
    }
    storedStyles.value = snapshot
  }

  function pasteStyles(elements: ExcalidrawElement[], markDirty: () => void): void {
    if (!storedStyles.value) return

    const snapshot = storedStyles.value
    for (const el of elements) {
      mutateElement(el, buildUpdatesForElement(snapshot, el))
    }

    syncDefaults(snapshot)
    markDirty()
  }

  return { storedStyles, hasStoredStyles, copyStyles, pasteStyles }
})
