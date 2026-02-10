import { shallowRef } from 'vue'
import type { Ref, ShallowRef } from 'vue'
import { useEventListener } from '@vueuse/core'
import type { ExcalidrawElement, ElementsMap } from '~/features/elements/types'
import type { ToolType } from '~/features/tools/types'
import type { GlobalPoint } from '~/shared/math'
import { createElement } from '~/features/elements/createElement'
import { mutateElement } from '~/features/elements/mutateElement'
import { getElementAtPosition } from '~/features/selection/hitTest'
import { useTheme } from '~/features/theme'
import { isCodeElement, getCodeData } from './types'
import type { CodeLanguage } from './types'
import { measureCode } from './measureCode'
import { useShikiHighlighter } from './useShikiHighlighter'
import { buildEditorDom } from './buildEditorDom'
import {
  CODE_FONT_SIZE,
  CODE_THEME_COLORS,
  DEFAULT_CODE_LANGUAGE,
} from './constants'

interface UseCodeInteractionOptions {
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

interface UseCodeInteractionReturn {
  editingCodeElement: ShallowRef<ExcalidrawElement | null>
  submitCodeEditor: () => void
}

export function useCodeInteraction(options: UseCodeInteractionOptions): UseCodeInteractionReturn {
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
  const { highlight, tokensToHtml } = useShikiHighlighter()
  const editingCodeElement = shallowRef<ExcalidrawElement | null>(null)
  let activeEditorContainer: HTMLDivElement | null = null

  function openEditor(element: ExcalidrawElement): void {
    editingCodeElement.value = element
    const editorContainer = textEditorContainerRef.value
    if (!editorContainer) return

    const codeData = getCodeData(element)
    const colors = CODE_THEME_COLORS[theme.value]

    const { container, selectEl, textarea, preEl } = buildEditorDom(
      {
        viewX: (element.x + scrollX.value) * zoom.value,
        viewY: (element.y + scrollY.value) * zoom.value,
        zoom: zoom.value,
      },
      { width: element.width, height: element.height },
      { bg: colors.bg, defaultText: colors.defaultText },
      codeData.language,
      codeData.code,
    )

    // Wire up event handlers
    selectEl.addEventListener('change', () => {
      const newLang = selectEl.value as CodeLanguage
      mutateElement(element, { customData: { ...getCodeData(element), language: newLang } })
      markStaticDirty()
      updateHighlight(textarea.value)
    })

    textarea.addEventListener('scroll', () => {
      preEl.scrollTop = textarea.scrollTop
      preEl.scrollLeft = textarea.scrollLeft
    })

    function updateHighlight(code: string): void {
      const lang = (selectEl.value as CodeLanguage) || codeData.language
      const tokens = highlight(code, lang, theme.value)
      if (tokens.length > 0) {
        preEl.innerHTML = tokensToHtml(tokens)
        return
      }
      if (preEl.innerHTML === '') {
        preEl.textContent = code
      }
    }

    updateHighlight(codeData.code)

    textarea.addEventListener('input', () => {
      const newCode = textarea.value
      const { width, height } = measureCode(newCode, CODE_FONT_SIZE)

      mutateElement(element, {
        customData: { ...getCodeData(element), code: newCode },
        width: Math.max(element.width, width),
        height: Math.max(height, 80),
      })
      markStaticDirty()
      updateHighlight(newCode)
    })

    textarea.addEventListener('keydown', (e: KeyboardEvent) => {
      e.stopPropagation()

      if (e.key === 'Tab') {
        e.preventDefault()
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        textarea.value = `${textarea.value.slice(0, start)}  ${textarea.value.slice(end)}`
        textarea.selectionStart = start + 2
        textarea.selectionEnd = start + 2
        textarea.dispatchEvent(new Event('input'))
        return
      }

      if (e.key === 'Escape') { e.preventDefault(); submitAndClose(); return }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submitAndClose() }
    })

    textarea.addEventListener('blur', (e: FocusEvent) => {
      if (e.relatedTarget === selectEl) return
      submitAndClose()
    })

    selectEl.addEventListener('blur', (e: FocusEvent) => {
      if (e.relatedTarget === textarea) return
      submitAndClose()
    })

    editorContainer.append(container)
    activeEditorContainer = container

    requestAnimationFrame(() => {
      textarea.focus()
      if (codeData.code.length > 0) textarea.select()
    })
  }

  function submitAndClose(): void {
    if (!activeEditorContainer) return

    const element = editingCodeElement.value
    const editorDiv = activeEditorContainer

    // Clear refs BEFORE removing — .remove() fires blur synchronously
    activeEditorContainer = null
    editingCodeElement.value = null

    if (element) {
      const codeData = getCodeData(element)
      if (codeData.code.trim() === '') {
        mutateElement(element, { isDeleted: true })
      }
    }

    editorDiv.remove()
    canvasRef.value?.focus()
    setTool('selection')
    markStaticDirty()
    markInteractiveDirty()
  }

  // Entry point 1: Code tool click on canvas — create new code element
  useEventListener(canvasRef, 'pointerdown', (e: PointerEvent) => {
    if (activeTool.value !== 'code') return
    if (spaceHeld.value || isPanning.value) return
    if (editingCodeElement.value) return

    const scenePoint = toScene(e.offsetX, e.offsetY)
    const colors = CODE_THEME_COLORS[theme.value]

    const el = createElement('rectangle', scenePoint[0], scenePoint[1], {
      customData: { code: '', language: DEFAULT_CODE_LANGUAGE },
      width: 300,
      height: 200,
      backgroundColor: colors.bg,
      strokeColor: 'transparent',
      strokeWidth: 0,
      roughness: 0,
    })

    addElement(el)
    select(el.id)

    const created = elements.value.find(e => e.id === el.id)
    if (!created) return

    // Switch tool BEFORE opening editor — otherwise onBeforeToolChange
    // sees editingCodeElement and immediately closes the editor
    setTool('selection')
    openEditor(created)
  })

  // Entry point 2: Double-click existing code element to re-edit
  useEventListener(canvasRef, 'dblclick', (e: MouseEvent) => {
    if (activeTool.value !== 'selection' && activeTool.value !== 'code') return
    if (spaceHeld.value || isPanning.value) return
    if (editingCodeElement.value) return

    const scenePoint = toScene(e.offsetX, e.offsetY)
    const hitElement = getElementAtPosition(scenePoint, elements.value, zoom.value)

    if (!hitElement || !isCodeElement(hitElement)) return

    openEditor(hitElement)
  })

  return { editingCodeElement, submitCodeEditor: submitAndClose }
}
