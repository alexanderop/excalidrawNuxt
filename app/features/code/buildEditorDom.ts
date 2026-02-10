import {
  CODE_FONT_SIZE,
  CODE_FONT_FAMILY,
  CODE_LANGUAGE_LABELS,
} from './constants'

interface EditorPosition {
  viewX: number
  viewY: number
  zoom: number
}

interface EditorDimensions {
  width: number
  height: number
}

interface EditorColors {
  bg: string
  defaultText: string
}

interface EditorDomResult {
  container: HTMLDivElement
  selectEl: HTMLSelectElement
  textarea: HTMLTextAreaElement
  preEl: HTMLPreElement
}

const SHARED_FONT_STYLES = {
  fontSize: `${CODE_FONT_SIZE}px`,
  fontFamily: CODE_FONT_FAMILY,
  lineHeight: '1.5',
  padding: '8px',
  tabSize: '2',
  whiteSpace: 'pre',
  overflowWrap: 'normal',
} as const

export function buildEditorDom(
  position: EditorPosition,
  dimensions: EditorDimensions,
  colors: EditorColors,
  currentLanguage: string,
  initialCode: string,
): EditorDomResult {
  const container = buildContainer(position)
  const selectEl = buildLanguageSelector(currentLanguage)
  const minHeight = `${Math.max(dimensions.height - 40, 80)}px`
  const codeWrapper = buildCodeWrapper(dimensions.width, minHeight)
  const preEl = buildHighlightOverlay(colors)
  const textarea = buildTextarea(colors, dimensions.width, minHeight, initialCode)

  codeWrapper.append(preEl)
  codeWrapper.append(textarea)
  container.append(selectEl)
  container.append(codeWrapper)

  return { container, selectEl, textarea, preEl }
}

function buildContainer(position: EditorPosition): HTMLDivElement {
  const container = document.createElement('div')
  container.style.position = 'absolute'
  container.style.pointerEvents = 'auto'
  container.style.display = 'flex'
  container.style.flexDirection = 'column'
  container.style.gap = '4px'
  container.style.left = `${position.viewX}px`
  container.style.top = `${position.viewY}px`
  container.style.transform = `scale(${position.zoom})`
  container.style.transformOrigin = '0 0'
  return container
}

function buildLanguageSelector(currentLanguage: string): HTMLSelectElement {
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
    if (lang === currentLanguage) option.selected = true
    selectEl.append(option)
  }

  return selectEl
}

function buildCodeWrapper(width: number, minHeight: string): HTMLDivElement {
  const wrapper = document.createElement('div')
  wrapper.style.position = 'relative'
  wrapper.style.minWidth = `${width}px`
  wrapper.style.minHeight = minHeight
  return wrapper
}

function buildHighlightOverlay(colors: EditorColors): HTMLPreElement {
  const preEl = document.createElement('pre')
  Object.assign(preEl.style, SHARED_FONT_STYLES)
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
  return preEl
}

function buildTextarea(
  colors: EditorColors,
  width: number,
  minHeight: string,
  initialCode: string,
): HTMLTextAreaElement {
  const textarea = document.createElement('textarea')
  Object.assign(textarea.style, SHARED_FONT_STYLES)
  textarea.style.position = 'relative'
  textarea.style.width = '100%'
  textarea.style.minWidth = `${width}px`
  textarea.style.minHeight = minHeight
  textarea.style.background = 'transparent'
  textarea.style.color = 'transparent'
  textarea.style.caretColor = colors.defaultText
  textarea.style.border = '1px solid transparent'
  textarea.style.borderRadius = '4px'
  textarea.style.resize = 'none'
  textarea.style.outline = 'none'
  textarea.style.boxSizing = 'border-box'
  textarea.style.zIndex = '1'
  textarea.value = initialCode
  textarea.spellcheck = false
  return textarea
}
