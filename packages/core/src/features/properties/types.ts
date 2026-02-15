import type { Ref } from "vue";
import type { Arrowhead, FillStyle, StrokeStyle, TextAlign } from "../elements/types";

export type Roundness = "sharp" | "round";

export type ArrowSubtype = "sharp" | "curved" | "elbow";

export interface StyleDefaults {
  strokeColor: Ref<string>;
  backgroundColor: Ref<string>;
  fillStyle: Ref<FillStyle>;
  strokeWidth: Ref<number>;
  strokeStyle: Ref<StrokeStyle>;
  opacity: Ref<number>;
  roughness: Ref<number>;
  roundness: Ref<Roundness>;
  fontFamily: Ref<number>;
  fontSize: Ref<number>;
  textAlign: Ref<TextAlign>;
  arrowSubtype: Ref<ArrowSubtype>;
  startArrowhead: Ref<Arrowhead | null>;
  endArrowhead: Ref<Arrowhead | null>;
  recentColors: Ref<string[]>;
}
