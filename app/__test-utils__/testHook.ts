import type { ShallowRef, ComputedRef, Ref } from 'vue'
import type { ExcalidrawElement, ElementsMap } from '~/features/elements/types'
import type { ToolType } from '~/features/tools/types'

export interface TestHook {
  // Elements
  elements: ShallowRef<readonly ExcalidrawElement[]>
  elementMap: ElementsMap
  addElement: (element: ExcalidrawElement) => void
  replaceElements: (newElements: readonly ExcalidrawElement[]) => void
  getElementById: (id: string) => ExcalidrawElement | undefined

  // Selection
  selectedIds: ShallowRef<ReadonlySet<string>>
  selectedElements: ComputedRef<ExcalidrawElement[]>
  select: (id: string) => void
  addToSelection: (id: string) => void
  clearSelection: () => void
  replaceSelection: (ids: Set<string>) => void
  isSelected: (id: string) => boolean

  // Tools
  activeTool: ShallowRef<ToolType>
  setTool: (tool: ToolType) => void

  // Viewport
  scrollX: Ref<number>
  scrollY: Ref<number>
  zoom: Ref<number>
  panBy: (dx: number, dy: number) => void
  zoomBy: (delta: number, center?: { x: number; y: number }) => void
  toScene: (screenX: number, screenY: number) => { x: number; y: number }

  // In-progress state
  newElement: ShallowRef<ExcalidrawElement | null>
  multiElement: ShallowRef<ExcalidrawElement | null>
  editingTextElement: ShallowRef<ExcalidrawElement | null>

  // Rendering
  markStaticDirty: () => void
  markInteractiveDirty: () => void
}

declare global {
   
  var __h: TestHook | undefined
}

export function getH(): TestHook {
  const h = globalThis.__h
  if (!h) throw new Error('Test hook not available — is CanvasContainer mounted?')
  return h
}
