import { ref, computed } from "vue";
import type { Ref, ComputedRef } from "vue";
import type { ExcalidrawElement, MutableElement } from "../../elements/types";
import { isTextElement } from "../../elements/types";
import { mutateElement } from "../../elements/mutateElement";
import { useDrawVue } from "../../../context";
import type { UseStyleDefaultsReturn } from "./useStyleDefaults";

const STYLE_KEYS = [
  "strokeColor",
  "backgroundColor",
  "fillStyle",
  "strokeWidth",
  "strokeStyle",
  "opacity",
  "roughness",
  "roundness",
  "fontFamily",
  "fontSize",
  "textAlign",
] as const;

type StyleKey = (typeof STYLE_KEYS)[number];

type StyleSnapshot = Partial<Record<StyleKey, unknown>>;

const TEXT_ONLY_KEYS: ReadonlySet<StyleKey> = new Set(["fontFamily", "fontSize", "textAlign"]);

function buildUpdatesForElement(
  snapshot: StyleSnapshot,
  el: ExcalidrawElement,
): Partial<MutableElement> {
  const updates: Partial<MutableElement> = {};
  for (const key of STYLE_KEYS) {
    if (!(key in snapshot)) continue;
    if (TEXT_ONLY_KEYS.has(key) && !isTextElement(el)) continue;
    (updates as Record<string, unknown>)[key] = snapshot[key];
  }
  return updates;
}

function elementProp(el: ExcalidrawElement, key: StyleKey): unknown {
  // eslint-disable-next-line no-restricted-syntax -- ExcalidrawElement doesn't index by StyleKey; single crossing point
  return (el as unknown as Record<string, unknown>)[key];
}

export interface UseStyleClipboardReturn {
  storedStyles: Ref<StyleSnapshot | null>;
  hasStoredStyles: ComputedRef<boolean>;
  copyStyles: (element: ExcalidrawElement) => void;
  pasteStyles: (elements: ExcalidrawElement[], markDirty: () => void) => void;
}

export function createStyleClipboard(
  styleDefaults: UseStyleDefaultsReturn,
): UseStyleClipboardReturn {
  const storedStyles = ref<StyleSnapshot | null>(null);

  const hasStoredStyles = computed(() => storedStyles.value !== null);

  function syncDefaults(snapshot: StyleSnapshot): void {
    for (const key of STYLE_KEYS) {
      if (!(key in snapshot)) continue;
      const defaultRef = styleDefaults[key as keyof typeof styleDefaults];
      if (defaultRef && "value" in defaultRef) {
        (defaultRef as { value: unknown }).value = snapshot[key];
      }
    }
  }

  function copyStyles(element: ExcalidrawElement): void {
    const snapshot: StyleSnapshot = {};
    for (const key of STYLE_KEYS) {
      const value = elementProp(element, key);
      if (value !== undefined) {
        snapshot[key] = value;
      }
    }
    storedStyles.value = snapshot;
  }

  function pasteStyles(elements: ExcalidrawElement[], markDirty: () => void): void {
    if (!storedStyles.value) return;

    const snapshot = storedStyles.value;
    for (const el of elements) {
      mutateElement(el, buildUpdatesForElement(snapshot, el));
    }

    syncDefaults(snapshot);
    markDirty();
  }

  return { storedStyles, hasStoredStyles, copyStyles, pasteStyles };
}

export function useStyleClipboard(): UseStyleClipboardReturn {
  return useDrawVue().styleClipboard;
}
