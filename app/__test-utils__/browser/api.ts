import type { ExcalidrawElement, ExcalidrawRectangleElement } from "~/features/elements/types";
import type { ToolType } from "~/features/tools/types";
import { getH } from "../testHook";
import type { TestHook } from "../testHook";
import { createTestElement } from "../factories/element";

export const API = {
  get h(): TestHook {
    return getH();
  },

  /** Read the current elements array. */
  get elements(): readonly ExcalidrawElement[] {
    return API.h.elements.value;
  },

  /** Programmatically set elements (bypasses drawing interaction). */
  setElements(elements: readonly ExcalidrawElement[]): void {
    API.h.replaceElements(elements);
  },

  /** Get selected elements. */
  getSelectedElements(): ExcalidrawElement[] {
    return API.h.selectedElements.value;
  },

  /** Get exactly one selected element or throw. */
  getSelectedElement(): ExcalidrawElement {
    const selected = API.getSelectedElements();
    if (selected.length !== 1) {
      throw new Error(`expected 1 selected element; got ${selected.length}`);
    }
    return selected[0]!;
  },

  /** Programmatically select elements. */
  setSelectedElements(elements: ExcalidrawElement[]): void {
    API.h.replaceSelection(new Set(elements.map((e) => e.id)));
  },

  /** Clear selection. */
  clearSelection(): void {
    API.h.clearSelection();
  },

  /** Create a test element and add it to the scene. */
  addElement(overrides?: Partial<ExcalidrawRectangleElement>): ExcalidrawElement {
    const el = createTestElement({
      ...overrides,
      id: overrides?.id ?? `api-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    });
    API.h.addElement(el);
    return el;
  },

  /** Get an element by ID from the current scene. */
  getElementByID(id: string): ExcalidrawElement | undefined {
    // eslint-disable-next-line unicorn/prefer-query-selector -- not a DOM call
    return API.h.getElementById(id);
  },

  /** Get the active tool. */
  get activeTool(): ToolType {
    return API.h.activeTool.value;
  },

  /** Programmatically set the active tool. */
  setTool(tool: ToolType): void {
    API.h.setTool(tool);
  },

  /** Get the current scroll position. */
  get scrollX(): number {
    return API.h.scrollX.value;
  },
  get scrollY(): number {
    return API.h.scrollY.value;
  },

  /** Get the current zoom level. */
  get zoom(): number {
    return API.h.zoom.value;
  },
};
