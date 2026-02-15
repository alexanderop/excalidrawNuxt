import type { ExcalidrawElement, FixedPointBinding } from "../elements/types";
import type { SupportedBindableElement } from "../elements/types";

export type BindableElement = SupportedBindableElement;

export function isBindableElement(el: ExcalidrawElement | null | undefined): el is BindableElement {
  if (!el) return false;
  return el.type === "rectangle" || el.type === "ellipse" || el.type === "diamond";
}

export type BindingEndpoint = "start" | "end";

/** Binding mode: 'orbit' projects onto shape edge with gap; 'inside' uses the fixedPoint scene coordinate directly. */
export type BindingMode = "orbit" | "inside";

/** Extended binding that carries an optional mode flag. */
export type BindingWithMode = FixedPointBinding & { mode?: BindingMode };
