import type { ExcalidrawElement } from "../elements/types";
import type { SupportedBindableElement } from "../elements/types";

export type BindableElement = SupportedBindableElement;

export function isBindableElement(el: ExcalidrawElement | null | undefined): el is BindableElement {
  if (!el) return false;
  return el.type === "rectangle" || el.type === "ellipse" || el.type === "diamond";
}

export type BindingEndpoint = "start" | "end";
