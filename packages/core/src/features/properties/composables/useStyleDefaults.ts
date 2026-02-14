import { ref, type Ref } from "vue";
import {
  DEFAULT_STROKE_COLOR,
  DEFAULT_BG_COLOR,
  DEFAULT_FILL_STYLE,
  DEFAULT_STROKE_WIDTH,
  DEFAULT_ROUGHNESS,
  DEFAULT_OPACITY,
  DEFAULT_FONT_SIZE,
  DEFAULT_FONT_FAMILY,
  DEFAULT_TEXT_ALIGN,
} from "../../elements/constants";
import type { Arrowhead, FillStyle, StrokeStyle, TextAlign } from "../../elements/types";
import type { ArrowSubtype, Roundness } from "../types";
import { useDrawVue } from "../../../context";

export interface UseStyleDefaultsReturn {
  strokeColor: Ref<string>;
  backgroundColor: Ref<string>;
  fillStyle: Ref<FillStyle>;
  strokeWidth: Ref<number>;
  strokeStyle: Ref<StrokeStyle>;
  opacity: Ref<number>;
  roughness: Ref<number>;
  roundness: Ref<Roundness>;
  arrowSubtype: Ref<ArrowSubtype>;
  fontFamily: Ref<number>;
  fontSize: Ref<number>;
  textAlign: Ref<TextAlign>;
  startArrowhead: Ref<Arrowhead | null>;
  endArrowhead: Ref<Arrowhead | null>;
  recentColors: Ref<string[]>;
  getStyleOverrides: () => Record<string, unknown>;
}

function getArrowSubtypeOverrides(
  subtype: ArrowSubtype,
  roundnessDefault: Roundness,
): Record<string, unknown> {
  switch (subtype) {
    case "curved": {
      return { roundness: { type: 2 }, elbowed: false };
    }
    case "elbow": {
      return { roundness: null, elbowed: true };
    }
    default: {
      return { roundness: roundnessDefault === "sharp" ? null : { type: 3 } };
    }
  }
}

export function createStyleDefaults(): UseStyleDefaultsReturn {
  const strokeColor = ref<string>(DEFAULT_STROKE_COLOR);
  const backgroundColor = ref<string>(DEFAULT_BG_COLOR);
  const fillStyle = ref<FillStyle>(DEFAULT_FILL_STYLE);
  const strokeWidth = ref<number>(DEFAULT_STROKE_WIDTH);
  const strokeStyle = ref<StrokeStyle>("solid");
  const opacity = ref<number>(DEFAULT_OPACITY);
  const roughness = ref<number>(DEFAULT_ROUGHNESS);
  const roundness = ref<Roundness>("round");
  const arrowSubtype = ref<ArrowSubtype>("sharp");
  const fontFamily = ref<number>(DEFAULT_FONT_FAMILY);
  const fontSize = ref<number>(DEFAULT_FONT_SIZE);
  const textAlign = ref<TextAlign>(DEFAULT_TEXT_ALIGN);
  const startArrowhead = ref<Arrowhead | null>(null);
  const endArrowhead = ref<Arrowhead | null>("arrow");
  const recentColors = ref<string[]>([]);

  /** Return current style values as a plain object for createElement overrides. */
  function getStyleOverrides(): Record<string, unknown> {
    return {
      strokeColor: strokeColor.value,
      backgroundColor: backgroundColor.value,
      fillStyle: fillStyle.value,
      strokeWidth: strokeWidth.value,
      strokeStyle: strokeStyle.value,
      opacity: opacity.value,
      roughness: roughness.value,
      ...getArrowSubtypeOverrides(arrowSubtype.value, roundness.value),
    };
  }

  return {
    strokeColor,
    backgroundColor,
    fillStyle,
    strokeWidth,
    strokeStyle,
    opacity,
    roughness,
    roundness,
    arrowSubtype,
    fontFamily,
    fontSize,
    textAlign,
    startArrowhead,
    endArrowhead,
    recentColors,
    getStyleOverrides,
  };
}

export function useStyleDefaults(): UseStyleDefaultsReturn {
  return useDrawVue().styleDefaults;
}
