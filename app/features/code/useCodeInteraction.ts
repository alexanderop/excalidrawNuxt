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
import {
  CODE_FONT_SIZE,
  CODE_FONT_FAMILY,
  CODE_THEME_COLORS,
  DEFAULT_CODE_LANGUAGE,
  CODE_LANGUAGE_LABELS,
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

    // Build editor DOM
    const container = document.createElement('div')
    container.style.position = 'absolute'
    container.style.pointerEvents = 'auto'
    container.style.display = 'flex'
    container.style.flexDirection = 'column'
    container.style.gap = '4px'

    // Position with zoom-aware transforms
    const viewX = (element.x + scrollX.value) * zoom.value
    const viewY = (element.y + scrollY.value) * zoom.value
    container.style.left = `${viewX}px`
    container.style.top = `${viewY}px`
    container.style.transform = `scale(${zoom.value})`
    container.style.transformOrigin = '0 0'

    // Language selector
    const selectEl = document.createElement('select')
    selectEl.style.background = '#2a2a3a'
    selectEl.style.color = '#cdd6f4'
    selectEl.style.border = '1px solid #585b70'
    selectEl.style.borderRadius = '4px'
    selectEl.style.padding = '2px 6px'
    selectEl.style.fontSize = '12px'
    selectEl.style.fontFamily = CODE_FONT_FAMILY
    selectEl.style.outline = 'none'
    selectEl.style.cursor = 'pointer'

    for (const lang of Object.keys(CODE_LANGUAGE_LABELS)) {
      const option = document.createElement('option')
      option.value = lang
      option.textContent = CODE_LANGUAGE_LABELS[lang] ?? lang
      if (lang === codeData.language) option.selected = true
      selectEl.append(option)
    }

    selectEl.addEventListener('change', () => {
      const newLang = selectEl.value as CodeLanguage
      mutateElement(element, { customData: { ...getCodeData(element), language: newLang } })
      markStaticDirty()
      // Re-highlight immediately with new language
      updateHighlight(textarea.value)
    })

    // Code editing area — transparent textarea over highlighted <pre>
    const colors = CODE_THEME_COLORS[theme.value]
    const sharedFontStyles = {
      fontSize: `${CODE_FONT_SIZE}px`,
      fontFamily: CODE_FONT_FAMILY,
      lineHeight: '1.5',
      padding: '8px',
      tabSize: '2',
      whiteSpace: 'pre',
      overflowWrap: 'normal',
    } as const

    // Wrapper for textarea + pre overlay
    const codeWrapper = document.createElement('div')
    codeWrapper.style.position = 'relative'
    codeWrapper.style.minWidth = `${element.width}px`
    codeWrapper.style.minHeight = `${Math.max(element.height - 40, 80)}px`

    // Highlighted overlay (behind textarea)
    const preEl = document.createElement('pre')
    Object.assign(preEl.style, sharedFontStyles)
    preEl.style.position = 'absolute'
    preEl.style.top = '0'
    preEl.style.left = '0'
    preEl.style.width = '100%'
    preEl.style.height = '100%'
    preEl.style.margin = '0'
    preEl.style.background = colors.bg
    preEl.style.color = colors.defaultText
    preEl.style.border = '1px solid #585b70'
    preEl.style.borderRadius = '4px'
    preEl.style.overflow = 'auto'
    preEl.style.pointerEvents = 'none'
    preEl.style.boxSizing = 'border-box'

    // Textarea (transparent text, visible caret)
    const textarea = document.createElement('textarea')
    Object.assign(textarea.style, sharedFontStyles)
    textarea.style.position = 'relative'
    textarea.style.width = '100%'
    textarea.style.minWidth = `${element.width}px`
    textarea.style.minHeight = `${Math.max(element.height - 40, 80)}px`
    textarea.style.background = 'transparent'
    textarea.style.color = 'transparent'
    textarea.style.caretColor = colors.defaultText
    textarea.style.border = '1px solid transparent'
    textarea.style.borderRadius = '4px'
    textarea.style.resize = 'none'
    textarea.style.outline = 'none'
    textarea.style.boxSizing = 'border-box'
    textarea.style.zIndex = '1'
    textarea.value = codeData.code
    textarea.spellcheck = false

    // Sync scroll positions
    textarea.addEventListener('scroll', () => {
      preEl.scrollTop = textarea.scrollTop
      preEl.scrollLeft = textarea.scrollLeft
    })

    // Highlighting helpers
    function updateHighlight(code: string): void {
      const lang = (selectEl.value as CodeLanguage) || codeData.language
      const tokens = highlight(code, lang, theme.value)
      if (tokens.length > 0) {
        preEl.innerHTML = tokensToHtml(tokens)
      }
      // If highlighter isn't ready yet, keep previous content (or fallback text)
      if (tokens.length === 0 && preEl.innerHTML === '') {
        preEl.textContent = code
      }
    }

    // Initial highlight
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
      // Don't close if focus moved to the language selector
      if (e.relatedTarget === selectEl) return
      submitAndClose()
    })

    selectEl.addEventListener('blur', (e: FocusEvent) => {
      // Don't close if focus moved to the textarea
      if (e.relatedTarget === textarea) return
      submitAndClose()
    })

    codeWrapper.append(preEl)
    codeWrapper.append(textarea)
    container.append(selectEl)
    container.append(codeWrapper)
    editorContainer.append(container)
    activeEditorContainer = container

    // Defer focus — pointerdown native handling steals focus if we focus synchronously
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
