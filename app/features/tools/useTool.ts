import { shallowRef } from 'vue'
import { createGlobalState, createEventHook, useActiveElement, useEventListener } from '@vueuse/core'
import type { ToolType } from './types'
import { isTypingElement } from '~/shared/isTypingElement'

const KEY_TO_TOOL: Record<string, ToolType> = {
  r: 'rectangle',
  o: 'ellipse',
  d: 'diamond',
  v: 'selection',
  h: 'hand',
  '1': 'selection',
  '2': 'rectangle',
  '3': 'diamond',
  '4': 'ellipse',
  a: 'arrow',
  '5': 'arrow',
  t: 'text',
  '6': 'text',
  c: 'code',
  '7': 'code',
}

export const useToolStore = createGlobalState(() => {
  const activeTool = shallowRef<ToolType>('selection')
  const { on: onBeforeToolChange, trigger: triggerBeforeChange } = createEventHook<void>()
  const activeElement = useActiveElement()

  function setTool(tool: ToolType): void {
    triggerBeforeChange()
    activeTool.value = tool
  }

  // Guard needed: createGlobalState runs in Node test environment where document is undefined
  if (typeof document !== 'undefined') {
    useEventListener(document, 'keydown', (e: KeyboardEvent) => {
      if (isTypingElement(activeElement.value)) return
      const tool = KEY_TO_TOOL[e.key]
      if (!tool) return
      setTool(tool)
    })
  }

  function $reset(): void {
    activeTool.value = 'selection'
  }

  return { activeTool, setTool, onBeforeToolChange, $reset }
})
