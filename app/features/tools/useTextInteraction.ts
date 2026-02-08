import { shallowRef } from 'vue'
import type { Ref, ShallowRef } from 'vue'
import { useEventListener } from '@vueuse/core'
import type { ExcalidrawElement, ExcalidrawTextElement } from '~/features/elements/types'
import { isTextElement } from '~/features/elements/types'
import type { ToolType } from './types'
import type { GlobalPoint } from '~/shared/math'
import { createElement } from '~/features/elements/createElement'
import { mutateElement } from '~/features/elements/mutateElement'
import { getElementAtPosition } from '~/features/selection/hitTest'
import { getFontString, measureText } from '~/features/rendering/textMeasurement'
import { resolveColor, useTheme } from '~/features/theme'

interface UseTextInteractionOptions {
  canvasRef: Ref<HTMLCanvasElement | null>
  textEditorContainerRef: Ref<HTMLDivElement | null>
  activeTool: ShallowRef<ToolType>
  setTool: (tool: ToolType) => void
  toScene: (x: number, y: number) => GlobalPoint
  zoom: Ref<number>
  scrollX: Ref<number>
  scrollY: Ref<number>
  elements: ShallowRef<readonly ExcalidrawElement[]>
  addElement: (el: ExcalidrawElement) => void
  select: (id: string) => void
  markStaticDirty: () => void
  markInteractiveDirty: () => void
  spaceHeld: Ref<boolean>
  isPanning: Ref<boolean>
}

interface UseTextInteractionReturn {
  editingTextElement: ShallowRef<ExcalidrawTextElement | null>
  submitTextEditor: () => void
}

export function useTextInteraction(options: UseTextInteractionOptions): UseTextInteractionReturn {
  const {
    canvasRef,
    textEditorContainerRef,
    activeTool,
    setTool,
    toScene,
    zoom,
    scrollX,
    scrollY,
    elements,
    addElement,
    select,
    markStaticDirty,
    markInteractiveDirty,
    spaceHeld,
    isPanning,
  } = options

  const { theme } = useTheme()
  const editingTextElement = shallowRef<ExcalidrawTextElement | null>(null)
  let activeTextarea: HTMLTextAreaElement | null = null

  function openEditor(element: ExcalidrawTextElement): void {
    editingTextElement.value = element

    const textarea = document.createElement('textarea')

    // Core styles — transparent overlay matching the element's visual appearance
    textarea.style.position = 'absolute'
    textarea.style.background = 'transparent'
    textarea.style.border = 'none'
    textarea.style.outline = 'none'
    textarea.style.resize = 'none'
    textarea.style.overflow = 'hidden'
    textarea.style.padding = '0'
    textarea.style.margin = '0'
    textarea.style.whiteSpace = 'pre'
    textarea.style.wordBreak = 'normal'
    textarea.setAttribute('wrap', 'off')

    // Match element font, color, alignment
    const font = getFontString(element.fontSize, element.fontFamily)
    textarea.style.font = font
    textarea.style.color = resolveColor(element.strokeColor, theme.value)
    textarea.style.textAlign = element.textAlign
    textarea.style.minWidth = '1ch'
    textarea.style.minHeight = '1em'
    textarea.style.lineHeight = String(element.lineHeight)

    // Position: convert scene coords to viewport pixels
    const viewX = (element.x + scrollX.value) * zoom.value
    const viewY = (element.y + scrollY.value) * zoom.value
    textarea.style.left = `${viewX}px`
    textarea.style.top = `${viewY}px`
    textarea.style.transform = `scale(${zoom.value})`
    textarea.style.transformOrigin = '0 0'

    // Set initial text content
    textarea.value = element.text

    // Allow pointer events on the textarea (container has pointer-events-none)
    textarea.style.pointerEvents = 'auto'

    // Resize to match existing text dimensions
    if (element.width > 0) {
      textarea.style.width = `${Math.max(element.width, 20)}px`
    }
    if (element.height > 0) {
      textarea.style.height = `${element.height}px`
    }

    // Attach event listeners before appending to DOM
    textarea.addEventListener('input', () => {
      const currentFont = getFontString(element.fontSize, element.fontFamily)
      const { width, height } = measureText(textarea.value, currentFont, element.lineHeight)
      mutateElement(element, { text: textarea.value, originalText: textarea.value, width, height })
      textarea.style.width = `${Math.max(width, 20)}px`
      textarea.style.height = `${height}px`
      markStaticDirty()
      markInteractiveDirty()
    })

    textarea.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        submitAndClose()
        return
      }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        submitAndClose()
      }
    })

    textarea.addEventListener('blur', () => {
      submitAndClose()
    })

    // Append and focus
    const container = textEditorContainerRef.value
    if (!container) return
    container.append(textarea)
    activeTextarea = textarea
    textarea.focus()

    // Auto-select existing text (like Excalidraw)
    if (element.text.length > 0) {
      textarea.select()
    }
  }

  function submitAndClose(): void {
    if (!activeTextarea) return

    const element = editingTextElement.value
    const textarea = activeTextarea
    const text = textarea.value

    // Clear refs BEFORE removing — .remove() fires blur synchronously,
    // which re-enters submitAndClose; the guard above prevents the double call.
    activeTextarea = null
    editingTextElement.value = null

    if (element && text.trim() === '') {
      mutateElement(element, { isDeleted: true })
    }
    if (element && text.trim() !== '') {
      const font = getFontString(element.fontSize, element.fontFamily)
      const { width, height } = measureText(text, font, element.lineHeight)
      mutateElement(element, { text, originalText: text, width, height })
    }

    textarea.remove()
    markStaticDirty()
    markInteractiveDirty()
  }

  function createAndEditText(sceneX: number, sceneY: number): void {
    const element = createElement('text', sceneX, sceneY)
    addElement(element)
    select(element.id)

    const textEl = elements.value.find(el => el.id === element.id)
    if (!textEl || !isTextElement(textEl)) return

    openEditor(textEl)
  }

  // Entry point 1: Text tool click on canvas — create new text element
  useEventListener(canvasRef, 'pointerdown', (e: PointerEvent) => {
    if (activeTool.value !== 'text') return
    if (spaceHeld.value || isPanning.value) return
    if (editingTextElement.value) return

    const scenePoint = toScene(e.offsetX, e.offsetY)

    // Switch tool BEFORE opening editor — otherwise onBeforeToolChange
    // sees editingTextElement and immediately closes the editor
    setTool('selection')
    createAndEditText(scenePoint[0], scenePoint[1])
  })

  // Entry point 2: Double-click to edit existing text or create new
  useEventListener(canvasRef, 'dblclick', (e: MouseEvent) => {
    if (spaceHeld.value || isPanning.value) return
    if (editingTextElement.value) return

    const scenePoint = toScene(e.offsetX, e.offsetY)
    const hitElement = getElementAtPosition(scenePoint, elements.value, zoom.value)

    if (hitElement && isTextElement(hitElement)) {
      openEditor(hitElement)
      return
    }

    // Don't create new text if another element was hit (e.g. arrow double-click)
    if (hitElement) return

    createAndEditText(scenePoint[0], scenePoint[1])
  })

  return { editingTextElement, submitTextEditor: submitAndClose }
}
