import { shallowRef } from 'vue'
import type { ShallowRef } from 'vue'
import { useEventListener, useActiveElement } from '@vueuse/core'
import type { ToolType } from './types'

interface UseToolReturn {
  activeTool: ShallowRef<ToolType>
  setTool: (tool: ToolType) => void
}

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
}

export function useTool(): UseToolReturn {
  const activeTool = shallowRef<ToolType>('selection')
  const activeElement = useActiveElement()

  function setTool(tool: ToolType): void {
    activeTool.value = tool
  }

  function isTyping(): boolean {
    const el = activeElement.value
    if (!el) return false
    const tag = el.tagName
    return tag === 'INPUT' || tag === 'TEXTAREA'
  }

  if (typeof document !== 'undefined') {
    useEventListener(document, 'keydown', (e: KeyboardEvent) => {
      if (isTyping()) return
      const tool = KEY_TO_TOOL[e.key]
      if (!tool) return
      setTool(tool)
    })
  }

  return { activeTool, setTool }
}
