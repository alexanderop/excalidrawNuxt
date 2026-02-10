<script setup lang="ts">
import { computed } from 'vue'
import type { ExcalidrawElement, Arrowhead } from '~/features/elements/types'
import { isTextElement, isArrowElement } from '~/features/elements/types'
import { useStyleDefaults } from '../composables/useStyleDefaults'
import { usePropertyActions } from '../composables/usePropertyActions'
import ButtonIconSelect from './ButtonIconSelect.vue'
import OpacitySlider from './OpacitySlider.vue'
import ColorSwatch from './ColorSwatch.vue'
import FontPicker from './FontPicker.vue'
import ArrowheadPicker from './ArrowheadPicker.vue'

const { selectedElements, markDirty } = defineProps<{
  selectedElements: ExcalidrawElement[]
  markDirty: () => void
}>()

const selectedElementsComputed = computed(() => selectedElements)

const styleDefaults = useStyleDefaults()

const actions = usePropertyActions({
  selectedElements: selectedElementsComputed,
  styleDefaults,
  markDirty,
})

const hasTextSelected = computed(() =>
  selectedElements.some(el => isTextElement(el)),
)

const hasArrowSelected = computed(() =>
  selectedElements.some(el => isArrowElement(el)),
)

// Current form values from selection
const currentStrokeColor = computed(() =>
  actions.getFormValue<string>('strokeColor', styleDefaults.strokeColor.value),
)
const currentBgColor = computed(() =>
  actions.getFormValue<string>('backgroundColor', styleDefaults.backgroundColor.value),
)
const currentFillStyle = computed(() =>
  actions.getFormValue<string>('fillStyle', styleDefaults.fillStyle.value),
)
const currentStrokeWidth = computed(() =>
  actions.getFormValue<number>('strokeWidth', styleDefaults.strokeWidth.value),
)
const currentStrokeStyle = computed(() =>
  actions.getFormValue<string>('strokeStyle', styleDefaults.strokeStyle.value),
)
const currentRoundness = computed(() => {
  const raw = actions.getFormValue<{ type: number } | null>('roundness', null)
  if (raw === 'mixed') return 'mixed'
  return raw === null ? 'sharp' : 'round'
})
const currentOpacity = computed(() => {
  const val = actions.getFormValue<number>('opacity', styleDefaults.opacity.value)
  if (val === 'mixed') return 50
  return val
})
const currentTextAlign = computed(() =>
  actions.getFormValue<string>('textAlign', styleDefaults.textAlign.value),
)
const currentFontFamily = computed(() =>
  actions.getFormValue<number>('fontFamily', styleDefaults.fontFamily.value),
)
const currentFontSize = computed(() => {
  const val = actions.getFormValue<number>('fontSize', styleDefaults.fontSize.value)
  if (val === 'mixed') return styleDefaults.fontSize.value
  return val
})
const currentStartArrowhead = computed(() =>
  actions.getFormValue<Arrowhead | null>('startArrowhead', styleDefaults.startArrowhead.value),
)
const currentEndArrowhead = computed(() =>
  actions.getFormValue<Arrowhead | null>('endArrowhead', styleDefaults.endArrowhead.value),
)

// Options for ButtonIconSelect groups
const fillStyleOptions = [
  { label: 'Hachure', value: 'hachure', icon: '<path d="M4 4l16 16M8 4l12 12M12 4l8 8M4 8l16 16M4 12l12 12M4 16l8 8"/>' },
  { label: 'Cross-hatch', value: 'cross-hatch', icon: '<path d="M4 4l16 16M20 4L4 20M8 4l12 12M16 4L4 16M12 4l8 8M12 20L4 12"/>' },
  { label: 'Solid', value: 'solid', icon: '<rect x="4" y="4" width="16" height="16" rx="2" fill="currentColor"/>' },
]

const strokeWidthOptions = [
  { label: 'Thin', value: 1, icon: '<line x1="4" y1="12" x2="20" y2="12" stroke-width="1"/>' },
  { label: 'Bold', value: 2, icon: '<line x1="4" y1="12" x2="20" y2="12" stroke-width="2.5"/>' },
  { label: 'Extra bold', value: 4, icon: '<line x1="4" y1="12" x2="20" y2="12" stroke-width="4"/>' },
]

const strokeStyleOptions = [
  { label: 'Solid', value: 'solid', icon: '<line x1="4" y1="12" x2="20" y2="12"/>' },
  { label: 'Dashed', value: 'dashed', icon: '<line x1="4" y1="12" x2="20" y2="12" stroke-dasharray="4 3"/>' },
  { label: 'Dotted', value: 'dotted', icon: '<line x1="4" y1="12" x2="20" y2="12" stroke-dasharray="1.5 3"/>' },
]

const roundnessOptions = [
  { label: 'Sharp', value: 'sharp', icon: '<rect x="4" y="4" width="16" height="16"/>' },
  { label: 'Round', value: 'round', icon: '<rect x="4" y="4" width="16" height="16" rx="4"/>' },
]

const textAlignOptions = [
  { label: 'Left', value: 'left', icon: '<line x1="4" y1="6" x2="16" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="14" y2="18"/>' },
  { label: 'Center', value: 'center', icon: '<line x1="6" y1="6" x2="18" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="7" y1="18" x2="17" y2="18"/>' },
  { label: 'Right', value: 'right', icon: '<line x1="8" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="10" y1="18" x2="20" y2="18"/>' },
]

function onFillStyleChange(val: string | number): void {
  actions.changeFillStyle(val as 'hachure' | 'cross-hatch' | 'solid')
}
function onStrokeWidthChange(val: string | number): void {
  actions.changeStrokeWidth(val as number)
}
function onStrokeStyleChange(val: string | number): void {
  actions.changeStrokeStyle(val as 'solid' | 'dashed' | 'dotted')
}
function onRoundnessChange(val: string | number): void {
  actions.changeRoundness(val as 'sharp' | 'round')
}
function onOpacityChange(val: number): void {
  actions.changeOpacity(val)
}
function onTextAlignChange(val: string | number): void {
  actions.changeTextAlign(val as 'left' | 'center' | 'right')
}
function onFontFamilyChange(val: number): void {
  actions.changeFontFamily(val)
}
function onFontSizeChange(event: Event): void {
  const input = event.target as HTMLInputElement
  const val = Number(input.value)
  if (val >= 8 && val <= 120) {
    actions.changeFontSize(val)
  }
}
function onStartArrowheadChange(val: Arrowhead | null): void {
  actions.changeArrowhead('start', val)
}
function onEndArrowheadChange(val: Arrowhead | null): void {
  actions.changeArrowhead('end', val)
}
</script>

<template>
  <div class="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-lg border border-edge/40 bg-surface/80 px-2 py-1.5 shadow-lg backdrop-blur-md">
    <!-- Stroke Color -->
    <ColorSwatch
      :color="currentStrokeColor === 'mixed' ? 'mixed' : currentStrokeColor"
      label="Stroke color"
      @update:color="actions.changeStrokeColor"
    />

    <!-- Background Color -->
    <ColorSwatch
      :color="currentBgColor === 'mixed' ? 'mixed' : currentBgColor"
      label="Background color"
      @update:color="actions.changeBackgroundColor"
    />

    <!-- Divider -->
    <div class="mx-0.5 h-6 w-px bg-edge/30" />

    <!-- Fill Style -->
    <ButtonIconSelect
      :options="fillStyleOptions"
      :model-value="currentFillStyle"
      @update:model-value="onFillStyleChange"
    />

    <div class="mx-0.5 h-6 w-px bg-edge/30" />

    <!-- Stroke Width -->
    <ButtonIconSelect
      :options="strokeWidthOptions"
      :model-value="currentStrokeWidth"
      @update:model-value="onStrokeWidthChange"
    />

    <div class="mx-0.5 h-6 w-px bg-edge/30" />

    <!-- Stroke Style -->
    <ButtonIconSelect
      :options="strokeStyleOptions"
      :model-value="currentStrokeStyle"
      @update:model-value="onStrokeStyleChange"
    />

    <div class="mx-0.5 h-6 w-px bg-edge/30" />

    <!-- Roundness -->
    <ButtonIconSelect
      :options="roundnessOptions"
      :model-value="currentRoundness"
      @update:model-value="onRoundnessChange"
    />

    <div class="mx-0.5 h-6 w-px bg-edge/30" />

    <!-- Opacity -->
    <OpacitySlider
      :model-value="currentOpacity"
      @update:model-value="onOpacityChange"
    />

    <!-- Text controls (shown when text elements selected) -->
    <template v-if="hasTextSelected">
      <div class="mx-0.5 h-6 w-px bg-edge/30" />

      <!-- Font Family -->
      <FontPicker
        :model-value="currentFontFamily"
        @update:model-value="onFontFamilyChange"
      />

      <!-- Font Size -->
      <input
        type="number"
        :value="currentFontSize"
        :min="8"
        :max="120"
        :step="4"
        aria-label="Font size"
        class="h-7 w-12 rounded border border-edge/30 bg-surface/60 px-1.5 text-center text-xs text-foreground/80 outline-none focus:border-accent/50"
        @change="onFontSizeChange"
      >

      <!-- Text Align -->
      <ButtonIconSelect
        :options="textAlignOptions"
        :model-value="currentTextAlign"
        @update:model-value="onTextAlignChange"
      />
    </template>

    <!-- Arrow controls (shown when arrow elements selected) -->
    <template v-if="hasArrowSelected">
      <div class="mx-0.5 h-6 w-px bg-edge/30" />

      <ArrowheadPicker
        label="Start"
        :model-value="currentStartArrowhead"
        @update:model-value="onStartArrowheadChange"
      />

      <ArrowheadPicker
        label="End"
        :model-value="currentEndArrowhead"
        @update:model-value="onEndArrowheadChange"
      />
    </template>
  </div>
</template>
