import { shallowRef } from "vue";
import { createGlobalState } from "@vueuse/core";
import type { ExcalidrawElement } from "~/features/elements/types";
import { generateId, randomInteger, randomVersionNonce } from "~/shared/random";

const PASTE_OFFSET = 10;

function cloneElement(el: ExcalidrawElement, offsetX: number, offsetY: number): ExcalidrawElement {
  return {
    ...structuredClone(el),
    id: generateId(),
    x: el.x + offsetX,
    y: el.y + offsetY,
    seed: randomInteger(),
    versionNonce: randomVersionNonce(),
    version: 0,
    updated: Date.now(),
  } as ExcalidrawElement;
}

export const useClipboard = createGlobalState(() => {
  const clipboard = shallowRef<readonly ExcalidrawElement[]>([]);

  function copy(elements: readonly ExcalidrawElement[]): void {
    if (elements.length === 0) return;
    clipboard.value = elements.map((el) => structuredClone(el));
  }

  function cut(
    elements: readonly ExcalidrawElement[],
    callbacks: {
      markDeleted: (els: readonly ExcalidrawElement[]) => void;
    },
  ): void {
    if (elements.length === 0) return;
    copy(elements);
    callbacks.markDeleted(elements);
  }

  function paste(callbacks: {
    addElement: (el: ExcalidrawElement) => void;
    select: (id: string) => void;
    replaceSelection: (ids: Set<string>) => void;
    markStaticDirty: () => void;
    markInteractiveDirty: () => void;
  }): void {
    if (clipboard.value.length === 0) return;

    const newIds = new Set<string>();
    for (const el of clipboard.value) {
      const cloned = cloneElement(el, PASTE_OFFSET, PASTE_OFFSET);
      callbacks.addElement(cloned);
      newIds.add(cloned.id);
    }

    callbacks.replaceSelection(newIds);
    callbacks.markStaticDirty();
    callbacks.markInteractiveDirty();
  }

  return { clipboard, copy, cut, paste };
});
