import type { ExcalidrawElement, ExcalidrawRectangleElement } from "../elements/types";

export type CodeLanguage = "typescript" | "vue";

export interface CodeElementData {
  code: string;
  language: CodeLanguage;
}

/** A rectangle element with code customData. */
export type CodeElement = ExcalidrawRectangleElement & { customData: CodeElementData };

export function isCodeElement(el: ExcalidrawElement): el is CodeElement {
  return el.type === "rectangle" && el.customData?.code !== undefined;
}

export function getCodeData(el: CodeElement): CodeElementData;
export function getCodeData(el: ExcalidrawElement): CodeElementData | undefined;
export function getCodeData(el: ExcalidrawElement): CodeElementData | undefined {
  if (!isCodeElement(el)) return undefined;
  return el.customData;
}
