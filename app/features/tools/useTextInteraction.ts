import { shallowRef } from 'vue'
import type { Ref, ShallowRef } from 'vue'
import { useEventListener } from '@vueuse/core'
import type {
  ExcalidrawElement,
  ExcalidrawTextElement,
  ElementsMap,
} from '~/features/elements/types'
import { isTextElement } from '~/features/elements/types'
import type { ToolType } from './types'
import type { GlobalPoint } from '~/shared/math'
import { createElement } from '~/features/elements/createElement'
import { mutateElement } from '~/features/elements/mutateElement'
import { getElementAtPosition } from '~/features/selection/hitTest'
import { getFontString, measureText } from '~/features/rendering/textMeasurement'
import { resolveColor, useTheme } from '~/features/theme'
import {
  isTextBindableContainer,
  getBoundTextElement,
  BOUND_TEXT_PADDING,
} from '~/features/elements'
import {
  bindTextToContainer,
  unbindTextFromContainer,
} from '~/features/binding'

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
  elementMap: ElementsMap
  addElement: (el: ExcalidrawElement) => void
  getElementById: (id: string) => ExcalidrawElement | undefined
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
    elementMap,
    addElement,
    getElementById,
    select,
    markStaticDirty,
    markInteractiveDirty,
    spaceHeld,
    isPanning,
  } = options

  const { theme } = useTheme()
  const editingTextElement = shallowRef<ExcalidrawTextElement | null>(null)
  let activeTextarea: HTMLTextAreaElement | null = null
  /** The container element when editing bound text */
  let editingContainer: ExcalidrawElement | null = null

  function createBaseTextarea(element: ExcalidrawTextElement): HTMLTextAreaElement {
    const textarea = document.createElement('textarea')

    textarea.style.position = 'absolute'
    textarea.style.background = 'transparent'
    textarea.style.border = 'none'
    textarea.style.outline = 'none'
    textarea.style.resize = 'none'
    textarea.style.overflow = 'hidden'
    textarea.style.padding = '0'
    textarea.style.margin = '0'
    textarea.style.pointerEvents = 'auto'
    textarea.style.minWidth = '1ch'
    textarea.style.minHeight = '1em'

    const font = getFontString(element.fontSize, element.fontFamily)
    textarea.style.font = font
    textarea.style.color = resolveColor(element.strokeColor, theme.value)
    textarea.style.lineHeight = String(element.lineHeight)

    textarea.value = element.originalText || element.text

    return textarea
  }

  function styleBoundTextarea(
    textarea: HTMLTextAreaElement,
    container: ExcalidrawElement,
  ): void {
    textarea.style.whiteSpace = 'pre-wrap'
    textarea.style.wordBreak = 'break-word'
    textarea.setAttribute('wrap', 'soft')
    textarea.style.textAlign = 'center'

    const maxWidth = container.width - BOUND_TEXT_PADDING * 2
    textarea.style.width = `${maxWidth}px`

    const cx = container.x + container.width / 2
    const cy = container.y + container.height / 2
    const viewX = (cx + scrollX.value) * zoom.value - (maxWidth * zoom.value) / 2
    const viewY = (cy + scrollY.value) * zoom.value
    textarea.style.left = `${viewX}px`
    textarea.style.top = `${viewY}px`
    textarea.style.transform = `scale(${zoom.value}) translateY(-50%)`
    textarea.style.transformOrigin = '0 0'
  }

  function styleStandaloneTextarea(textarea: HTMLTextAreaElement, element: ExcalidrawTextElement): void {
    textarea.style.whiteSpace = 'pre'
    textarea.style.wordBreak = 'normal'
    textarea.setAttribute('wrap', 'off')
    textarea.style.textAlign = element.textAlign

    const viewX = (element.x + scrollX.value) * zoom.value
    const viewY = (element.y + scrollY.value) * zoom.value
    textarea.style.left = `${viewX}px`
    textarea.style.top = `${viewY}px`
    textarea.style.transform = `scale(${zoom.value})`
    textarea.style.transformOrigin = '0 0'

    if (element.width > 0) textarea.style.width = `${Math.max(element.width, 20)}px`
    if (element.height > 0) textarea.style.height = `${element.height}px`
  }

  function openEditor(element: ExcalidrawTextElement, container?: ExcalidrawElement): void {
    editingTextElement.value = element
    editingContainer = container ?? getElementById(element.containerId ?? '') ?? null

    const isBound = !!editingContainer
    const textarea = createBaseTextarea(element)

    if (isBound && editingContainer) {
      styleBoundTextarea(textarea, editingContainer)
    }
    if (!isBound) {
      styleStandaloneTextarea(textarea, element)
    }

    textarea.addEventListener('input', () => {
      if (isBound && editingContainer) handleBoundTextInput(textarea, element, editingContainer)
      if (!isBound) handleStandaloneTextInput(textarea, element)
    })

    textarea.addEventListener('keydown', (e: KeyboardEvent) => {
      e.stopPropagation()
      if (e.key === 'Escape') { e.preventDefault(); submitAndClose(); return }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submitAndClose() }
    })

    textarea.addEventListener('blur', () => submitAndClose())

    const editorContainer = textEditorContainerRef.value
    if (!editorContainer) return
    editorContainer.append(textarea)
    activeTextarea = textarea
    textarea.focus()

    if (element.text.length > 0) textarea.select()
  }

  function handleStandaloneTextInput(textarea: HTMLTextAreaElement, element: ExcalidrawTextElement): void {
    const currentFont = getFontString(element.fontSize, element.fontFamily)
    const { width, height } = measureText(textarea.value, currentFont, element.lineHeight)
    mutateElement(element, { text: textarea.value, originalText: textarea.value, width, height })
    textarea.style.width = `${Math.max(width, 20)}px`
    textarea.style.height = `${height}px`
    markStaticDirty()
    markInteractiveDirty()
  }

  function handleBoundTextInput(
    textarea: HTMLTextAreaElement,
    element: ExcalidrawTextElement,
    container: ExcalidrawElement,
  ): void {
    const font = getFontString(element.fontSize, element.fontFamily)
    const maxWidth = container.width - BOUND_TEXT_PADDING * 2
    const { height } = measureText(textarea.value, font, element.lineHeight)

    // Auto-grow container if text overflows
    const minContainerHeight = height + BOUND_TEXT_PADDING * 2
    if (container.height < minContainerHeight) {
      mutateElement(container, { height: minContainerHeight })
    }

    mutateElement(element, {
      text: textarea.value,
      originalText: textarea.value,
      width: maxWidth,
      height,
    })

    textarea.style.height = `${height}px`

    markStaticDirty()
    markInteractiveDirty()
  }

  function submitAndClose(): void {
    if (!activeTextarea) return

    const element = editingTextElement.value
    const container = editingContainer
    const textarea = activeTextarea
    const text = textarea.value

    // Clear refs BEFORE removing — .remove() fires blur synchronously,
    // which re-enters submitAndClose; the guard above prevents the double call.
    activeTextarea = null
    editingTextElement.value = null
    editingContainer = null

    if (element && container) {
      submitBoundText(element, container, text)
    }
    if (element && !container) {
      submitStandaloneText(element, text)
    }

    textarea.remove()
    canvasRef.value?.focus()
    markStaticDirty()
    markInteractiveDirty()
  }

  function submitStandaloneText(element: ExcalidrawTextElement, text: string): void {
    if (text.trim() === '') {
      mutateElement(element, { isDeleted: true })
      return
    }
    const font = getFontString(element.fontSize, element.fontFamily)
    const { width, height } = measureText(text, font, element.lineHeight)
    mutateElement(element, { text, originalText: text, width, height })
  }

  function submitBoundText(
    element: ExcalidrawTextElement,
    container: ExcalidrawElement,
    rawText: string,
  ): void {
    if (rawText.trim() === '') {
      mutateElement(element, { isDeleted: true })
      unbindTextFromContainer(element, container)
      return
    }

    const font = getFontString(element.fontSize, element.fontFamily)
    const maxWidth = container.width - BOUND_TEXT_PADDING * 2
    const { height } = measureText(rawText, font, element.lineHeight)

    // Grow container if needed
    const minContainerHeight = height + BOUND_TEXT_PADDING * 2
    if (container.height < minContainerHeight) {
      mutateElement(container, { height: minContainerHeight })
    }

    // Center text within container
    const x = container.x + (container.width - maxWidth) / 2
    const y = container.y + (container.height - height) / 2

    mutateElement(element, {
      text: rawText,
      originalText: rawText,
      width: maxWidth,
      height,
      x,
      y,
    })
  }

  function createAndEditText(sceneX: number, sceneY: number): void {
    const element = createElement('text', sceneX, sceneY)
    addElement(element)
    select(element.id)

    const textEl = elements.value.find(el => el.id === element.id)
    if (!textEl || !isTextElement(textEl)) return

    openEditor(textEl)
  }

  function createBoundTextAndEdit(container: ExcalidrawElement): void {
    const cx = container.x + container.width / 2
    const cy = container.y + container.height / 2
    const element = createElement('text', cx, cy, {
      containerId: container.id,
      textAlign: 'center',
      verticalAlign: 'middle',
      autoResize: true,
    })

    addElement(element)
    bindTextToContainer(element as ExcalidrawTextElement, container)
    select(container.id)

    const textEl = elements.value.find(el => el.id === element.id)
    if (!textEl || !isTextElement(textEl)) return

    openEditor(textEl, container)
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

  function handleDblClickOnElement(hitElement: ExcalidrawElement): boolean {
    // Edit standalone text (not bound to a container)
    if (isTextElement(hitElement) && !hitElement.containerId) {
      openEditor(hitElement)
      return true
    }

    // Double-click on a shape → edit or create bound text
    if (!isTextBindableContainer(hitElement)) return true

    const boundText = getBoundTextElement(hitElement, elementMap)
    if (boundText && isTextElement(boundText)) {
      openEditor(boundText, hitElement)
      return true
    }
    createBoundTextAndEdit(hitElement)
    return true
  }

  // Entry point 2: Double-click to edit existing text or create new
  useEventListener(canvasRef, 'dblclick', (e: MouseEvent) => {
    if (activeTool.value !== 'selection' && activeTool.value !== 'text') return
    if (spaceHeld.value || isPanning.value) return
    if (editingTextElement.value) return

    const scenePoint = toScene(e.offsetX, e.offsetY)
    const hitElement = getElementAtPosition(scenePoint, elements.value, zoom.value)

    if (hitElement) { handleDblClickOnElement(hitElement); return }

    createAndEditText(scenePoint[0], scenePoint[1])
  })

  return { editingTextElement, submitTextEditor: submitAndClose }
}
