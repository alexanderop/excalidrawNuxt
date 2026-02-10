import { ref } from 'vue'
import { createGlobalState } from '@vueuse/core'
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
} from '~/features/elements/constants'
import type { Arrowhead, FillStyle, StrokeStyle, TextAlign } from '~/features/elements/types'
import type { Roundness } from '../types'

export const useStyleDefaults = createGlobalState(() => {
  const strokeColor = ref<string>(DEFAULT_STROKE_COLOR)
  const backgroundColor = ref<string>(DEFAULT_BG_COLOR)
  const fillStyle = ref<FillStyle>(DEFAULT_FILL_STYLE)
  const strokeWidth = ref<number>(DEFAULT_STROKE_WIDTH)
  const strokeStyle = ref<StrokeStyle>('solid')
  const opacity = ref<number>(DEFAULT_OPACITY)
  const roughness = ref<number>(DEFAULT_ROUGHNESS)
  const roundness = ref<Roundness>('round')
  const fontFamily = ref<number>(DEFAULT_FONT_FAMILY)
  const fontSize = ref<number>(DEFAULT_FONT_SIZE)
  const textAlign = ref<TextAlign>(DEFAULT_TEXT_ALIGN)
  const startArrowhead = ref<Arrowhead | null>(null)
  const endArrowhead = ref<Arrowhead | null>('arrow')
  const recentColors = ref<string[]>([])

  return {
    strokeColor,
    backgroundColor,
    fillStyle,
    strokeWidth,
    strokeStyle,
    opacity,
    roughness,
    roundness,
    fontFamily,
    fontSize,
    textAlign,
    startArrowhead,
    endArrowhead,
    recentColors,
  }
})
