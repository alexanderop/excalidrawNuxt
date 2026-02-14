import type { ComputedRef } from "vue";
import type {
  ExcalidrawElement,
  Arrowhead,
  FillStyle,
  MutableElement,
  StrokeStyle,
  TextAlign,
} from "../../elements/types";
import { mutateElement } from "../../elements/mutateElement";
import type { ArrowSubtype, StyleDefaults, Roundness } from "../types";

interface UsePropertyActionsOptions {
  selectedElements: ComputedRef<ExcalidrawElement[]>;
  styleDefaults: StyleDefaults;
  markDirty: () => void;
  onBeforeChange?: () => void;
}

interface UsePropertyActionsReturn {
  changeStrokeColor: (color: string) => void;
  changeBackgroundColor: (color: string) => void;
  changeFillStyle: (style: FillStyle) => void;
  changeStrokeWidth: (width: number) => void;
  changeStrokeStyle: (style: StrokeStyle) => void;
  changeOpacity: (opacity: number) => void;
  changeRoughness: (roughness: number) => void;
  changeRoundness: (type: Roundness) => void;
  changeFontFamily: (family: number) => void;
  changeFontSize: (size: number) => void;
  changeTextAlign: (align: TextAlign) => void;
  changeArrowhead: (position: "start" | "end", type: Arrowhead | null) => void;
  changeArrowSubtype: (subtype: ArrowSubtype) => void;
  getFormValue: <T>(
    property: string,
    fallback: T,
    isRelevant?: (el: ExcalidrawElement) => boolean,
  ) => T | "mixed";
}

function getArrowSubtypeUpdates(subtype: ArrowSubtype): Record<string, unknown> {
  switch (subtype) {
    case "curved": {
      return { roundness: { type: 2 }, elbowed: false };
    }
    case "elbow": {
      return { roundness: null, elbowed: true };
    }
    default: {
      return { roundness: null, elbowed: false };
    }
  }
}

export function usePropertyActions(options: UsePropertyActionsOptions): UsePropertyActionsReturn {
  const { selectedElements, styleDefaults, markDirty, onBeforeChange } = options;

  function applyAndRemember<K extends keyof StyleDefaults>(
    key: K,
    value: StyleDefaults[K]["value"],
    updates?: Partial<MutableElement>,
  ): void {
    onBeforeChange?.();
    for (const el of selectedElements.value) {
      mutateElement(el, updates ?? { [key]: value });
    }
    markDirty();
    styleDefaults[key].value = value;
  }

  function changeStrokeColor(color: string): void {
    applyAndRemember("strokeColor", color);
  }

  function changeBackgroundColor(color: string): void {
    applyAndRemember("backgroundColor", color);
  }

  function changeFillStyle(style: FillStyle): void {
    applyAndRemember("fillStyle", style);
  }

  function changeStrokeWidth(width: number): void {
    applyAndRemember("strokeWidth", width);
  }

  function changeStrokeStyle(style: StrokeStyle): void {
    applyAndRemember("strokeStyle", style);
  }

  function changeOpacity(opacity: number): void {
    applyAndRemember("opacity", opacity);
  }

  function changeRoughness(roughness: number): void {
    applyAndRemember("roughness", roughness);
  }

  function changeRoundness(type: Roundness): void {
    const roundness = type === "sharp" ? null : { type: 3 as const };
    applyAndRemember("roundness", type, { roundness });
  }

  function changeFontFamily(family: number): void {
    applyAndRemember("fontFamily", family);
  }

  function changeFontSize(size: number): void {
    applyAndRemember("fontSize", size);
  }

  function changeTextAlign(align: TextAlign): void {
    applyAndRemember("textAlign", align);
  }

  function changeArrowhead(position: "start" | "end", type: Arrowhead | null): void {
    const property = position === "start" ? "startArrowhead" : "endArrowhead";
    applyAndRemember(property, type);
  }

  function changeArrowSubtype(subtype: ArrowSubtype): void {
    onBeforeChange?.();

    const arrowUpdates = getArrowSubtypeUpdates(subtype);
    for (const el of selectedElements.value) {
      mutateElement(el, arrowUpdates);
    }
    markDirty();
    styleDefaults.arrowSubtype.value = subtype;
  }

  function getFormValue<T>(
    property: string,
    fallback: T,
    isRelevant?: (el: ExcalidrawElement) => boolean,
  ): T | "mixed" {
    const elements = isRelevant
      ? selectedElements.value.filter(isRelevant)
      : selectedElements.value;
    if (elements.length === 0) return fallback;

    const values = new Set(elements.map((el) => (el as Record<string, unknown>)[property] as T));
    if (values.size === 1) return values.values().next().value as T;
    return "mixed";
  }

  return {
    changeStrokeColor,
    changeBackgroundColor,
    changeFillStyle,
    changeStrokeWidth,
    changeStrokeStyle,
    changeOpacity,
    changeRoughness,
    changeRoundness,
    changeFontFamily,
    changeFontSize,
    changeTextAlign,
    changeArrowhead,
    changeArrowSubtype,
    getFormValue,
  };
}
