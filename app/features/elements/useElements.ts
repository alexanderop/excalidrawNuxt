import { shallowRef } from "vue";
import type { ShallowRef } from "vue";
import { createGlobalState } from "@vueuse/core";
import type { ExcalidrawElement, ElementsMap } from "./types";

interface UseElementsReturn {
  elements: ShallowRef<readonly ExcalidrawElement[]>;
  elementMap: ElementsMap;
  addElement: (element: ExcalidrawElement) => void;
  replaceElements: (newElements: readonly ExcalidrawElement[]) => void;
  getElementById: (id: string) => ExcalidrawElement | undefined;
}

export const useElements = createGlobalState((): UseElementsReturn => {
  const elements = shallowRef<readonly ExcalidrawElement[]>([]);
  const elementMap = new Map<string, ExcalidrawElement>();

  function addElement(element: ExcalidrawElement): void {
    elements.value = [...elements.value, element];
    elementMap.set(element.id, element);
  }

  function replaceElements(newElements: readonly ExcalidrawElement[]): void {
    elements.value = newElements;
    elementMap.clear();
    for (const el of newElements) {
      elementMap.set(el.id, el);
    }
  }

  function getElementById(id: string): ExcalidrawElement | undefined {
    return elementMap.get(id);
  }

  return {
    elements,
    elementMap,
    addElement,
    replaceElements,
    getElementById,
  };
});
