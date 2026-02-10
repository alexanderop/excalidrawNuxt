import type { Ref } from 'vue'
import type {
  Arrowhead,
  FillStyle,
  StrokeStyle,
  TextAlign,
} from '~/features/elements/types'

export type Roundness = 'sharp' | 'round'

export interface StyleDefaults {
  strokeColor: Ref<string>
  backgroundColor: Ref<string>
  fillStyle: Ref<FillStyle>
  strokeWidth: Ref<number>
  strokeStyle: Ref<StrokeStyle>
  opacity: Ref<number>
  roughness: Ref<number>
  roundness: Ref<Roundness>
  fontFamily: Ref<number>
  fontSize: Ref<number>
  textAlign: Ref<TextAlign>
  startArrowhead: Ref<Arrowhead | null>
  endArrowhead: Ref<Arrowhead | null>
  recentColors: Ref<string[]>
}
