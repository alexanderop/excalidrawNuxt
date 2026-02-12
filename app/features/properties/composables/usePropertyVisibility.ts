import { computed, type ComputedRef, type Ref } from "vue";
import type { ExcalidrawElement } from "~/features/elements/types";
import type { ToolType } from "~/features/tools/types";
import {
  hasStrokeColor,
  hasBackground,
  hasFillStyle,
  hasStrokeWidth,
  hasStrokeStyle,
  hasRoughness,
  canChangeRoundness,
} from "../propertyPredicates";

export interface PropertyVisibility {
  showStrokeColor: ComputedRef<boolean>;
  showBackground: ComputedRef<boolean>;
  showColors: ComputedRef<boolean>;
  showFillStyle: ComputedRef<boolean>;
  showStrokeWidth: ComputedRef<boolean>;
  showStrokeStyle: ComputedRef<boolean>;
  showRoughness: ComputedRef<boolean>;
  showRoundness: ComputedRef<boolean>;
  showStyleGroup: ComputedRef<boolean>;
  showShapeGroup: ComputedRef<boolean>;
  hasText: ComputedRef<boolean>;
  hasArrow: ComputedRef<boolean>;
}

/** Tool types that map 1:1 to an element type for property visibility. */
const TOOL_ELEMENT_TYPES: ReadonlySet<string> = new Set([
  "rectangle",
  "ellipse",
  "diamond",
  "arrow",
  "line",
  "freedraw",
  "text",
]);

export function usePropertyVisibility(
  selectedElements: ComputedRef<ExcalidrawElement[]>,
  activeTool?: Ref<ToolType>,
): PropertyVisibility {
  /** Check a predicate against selected elements, falling back to active tool type. */
  function check(predicate: (type: string) => boolean): ComputedRef<boolean> {
    return computed(() => {
      if (selectedElements.value.some((el) => predicate(el.type))) return true;
      if (activeTool && selectedElements.value.length === 0) {
        return TOOL_ELEMENT_TYPES.has(activeTool.value) && predicate(activeTool.value);
      }
      return false;
    });
  }

  const showStrokeColor = check(hasStrokeColor);
  const showBackground = check(hasBackground);
  const showColors = computed(() => showStrokeColor.value || showBackground.value);

  const showFillStyle = check(hasFillStyle);
  const showStrokeWidth = check(hasStrokeWidth);
  const showStrokeStyle = check(hasStrokeStyle);
  const showStyleGroup = computed(
    () => showFillStyle.value || showStrokeWidth.value || showStrokeStyle.value,
  );

  const showRoughness = check(hasRoughness);
  const showRoundness = check(canChangeRoundness);
  const showShapeGroup = computed(() => showRoughness.value || showRoundness.value);

  const hasText = check((type) => type === "text");
  const hasArrow = check((type) => type === "arrow");

  return {
    showStrokeColor,
    showBackground,
    showColors,
    showFillStyle,
    showStrokeWidth,
    showStrokeStyle,
    showRoughness,
    showRoundness,
    showStyleGroup,
    showShapeGroup,
    hasText,
    hasArrow,
  };
}
