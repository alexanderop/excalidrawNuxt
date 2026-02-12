import { computed, type ComputedRef } from "vue";
import type { ExcalidrawElement } from "~/features/elements/types";
import { isTextElement, isArrowElement } from "~/features/elements/types";
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

export function usePropertyVisibility(
  selectedElements: ComputedRef<ExcalidrawElement[]>,
): PropertyVisibility {
  const showStrokeColor = computed(() =>
    selectedElements.value.some((el) => hasStrokeColor(el.type)),
  );
  const showBackground = computed(() =>
    selectedElements.value.some((el) => hasBackground(el.type)),
  );
  const showColors = computed(() => showStrokeColor.value || showBackground.value);

  const showFillStyle = computed(() => selectedElements.value.some((el) => hasFillStyle(el.type)));
  const showStrokeWidth = computed(() =>
    selectedElements.value.some((el) => hasStrokeWidth(el.type)),
  );
  const showStrokeStyle = computed(() =>
    selectedElements.value.some((el) => hasStrokeStyle(el.type)),
  );
  const showStyleGroup = computed(
    () => showFillStyle.value || showStrokeWidth.value || showStrokeStyle.value,
  );

  const showRoughness = computed(() => selectedElements.value.some((el) => hasRoughness(el.type)));
  const showRoundness = computed(() =>
    selectedElements.value.some((el) => canChangeRoundness(el.type)),
  );
  const showShapeGroup = computed(() => showRoughness.value || showRoundness.value);

  const hasText = computed(() => selectedElements.value.some((el) => isTextElement(el)));
  const hasArrow = computed(() => selectedElements.value.some((el) => isArrowElement(el)));

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
