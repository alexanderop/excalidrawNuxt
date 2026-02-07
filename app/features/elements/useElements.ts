import { shallowRef } from 'vue'
import type { ShallowRef } from 'vue'
import type { ExcalidrawElement } from './types'

interface UseElementsReturn {
  elements: ShallowRef<readonly ExcalidrawElement[]>
  addElement: (element: ExcalidrawElement) => void
  replaceElements: (newElements: readonly ExcalidrawElement[]) => void
}

export function useElements(): UseElementsReturn {
  const elements = shallowRef<readonly ExcalidrawElement[]>([])

  function addElement(element: ExcalidrawElement): void {
    elements.value = [...elements.value, element]
  }

  function replaceElements(newElements: readonly ExcalidrawElement[]): void {
    elements.value = newElements
  }

  return {
    elements,
    addElement,
    replaceElements,
  }
}
