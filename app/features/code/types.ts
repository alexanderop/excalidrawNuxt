import type { ExcalidrawElement } from '~/features/elements/types'

export type CodeLanguage = 'typescript' | 'vue'

export interface CodeElementData {
  code: string
  language: CodeLanguage
}

export function isCodeElement(el: ExcalidrawElement): boolean {
  return el.type === 'rectangle' && el.customData?.code !== undefined
}

export function getCodeData(el: ExcalidrawElement): CodeElementData {
  return el.customData as CodeElementData
}
