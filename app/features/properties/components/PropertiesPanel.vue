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

const { selectedElements } = defineProps<{
  selectedElements: ExcalidrawElement[]
}>()

const emit = defineEmits<{
  'mark-dirty': []
  'bring-to-front': []
  'bring-forward': []
  'send-backward': []
  'send-to-back': []
  'delete': []
  'duplicate': []
}>()

const styleDefaults = useStyleDefaults()

const actions = usePropertyActions({
  selectedElements: computed(() => selectedElements),
  styleDefaults,
  markDirty: () => emit('mark-dirty'),
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
const currentRoughness = computed(() =>
  actions.getFormValue<number>('roughness', styleDefaults.roughness.value),
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

const roughnessOptions = [
  { label: 'Architect', value: 0, icon: '<line x1="4" y1="12" x2="20" y2="12"/>' },
  { label: 'Artist', value: 1, icon: '<path d="M4 12c2-2 4 2 6 0s4-2 6 0"/>' },
  { label: 'Cartoonist', value: 2, icon: '<path d="M4 12c1-4 3 4 5-2s3 4 5-1 3 3 6 1"/>' },
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
function onRoughnessChange(val: string | number): void {
  actions.changeRoughness(val as number)
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
  <div
    class="properties-sidebar absolute left-3 top-16 z-10 flex w-52 flex-col rounded-lg border border-edge/40 bg-surface/80 shadow-lg backdrop-blur-md max-h-[calc(100vh-6rem)] overflow-y-auto"
  >
    <!-- Stroke -->
    <div class="border-b border-edge/20 px-3 py-2.5">
      <span class="mb-1.5 block text-[11px] font-medium tracking-wide text-foreground/50">Stroke</span>
      <div class="flex items-center gap-1.5">
        <ColorSwatch
          :color="currentStrokeColor === 'mixed' ? 'mixed' : currentStrokeColor"
          label="Stroke color"
          @update:color="actions.changeStrokeColor"
        />
      </div>
    </div>

    <!-- Background -->
    <div class="border-b border-edge/20 px-3 py-2.5">
      <span class="mb-1.5 block text-[11px] font-medium tracking-wide text-foreground/50">Background</span>
      <div class="flex items-center gap-1.5">
        <ColorSwatch
          :color="currentBgColor === 'mixed' ? 'mixed' : currentBgColor"
          label="Background color"
          @update:color="actions.changeBackgroundColor"
        />
      </div>
    </div>

    <!-- Fill Style -->
    <div class="border-b border-edge/20 px-3 py-2.5">
      <span class="mb-1.5 block text-[11px] font-medium tracking-wide text-foreground/50">Fill</span>
      <ButtonIconSelect
        :options="fillStyleOptions"
        :model-value="currentFillStyle"
        @update:model-value="onFillStyleChange"
      />
    </div>

    <!-- Stroke Width -->
    <div class="border-b border-edge/20 px-3 py-2.5">
      <span class="mb-1.5 block text-[11px] font-medium tracking-wide text-foreground/50">Stroke width</span>
      <ButtonIconSelect
        :options="strokeWidthOptions"
        :model-value="currentStrokeWidth"
        @update:model-value="onStrokeWidthChange"
      />
    </div>

    <!-- Stroke Style -->
    <div class="border-b border-edge/20 px-3 py-2.5">
      <span class="mb-1.5 block text-[11px] font-medium tracking-wide text-foreground/50">Stroke style</span>
      <ButtonIconSelect
        :options="strokeStyleOptions"
        :model-value="currentStrokeStyle"
        @update:model-value="onStrokeStyleChange"
      />
    </div>

    <!-- Sloppiness -->
    <div class="border-b border-edge/20 px-3 py-2.5">
      <span class="mb-1.5 block text-[11px] font-medium tracking-wide text-foreground/50">Sloppiness</span>
      <ButtonIconSelect
        :options="roughnessOptions"
        :model-value="currentRoughness"
        @update:model-value="onRoughnessChange"
      />
    </div>

    <!-- Edges -->
    <div class="border-b border-edge/20 px-3 py-2.5">
      <span class="mb-1.5 block text-[11px] font-medium tracking-wide text-foreground/50">Edges</span>
      <ButtonIconSelect
        :options="roundnessOptions"
        :model-value="currentRoundness"
        @update:model-value="onRoundnessChange"
      />
    </div>

    <!-- Opacity -->
    <div class="border-b border-edge/20 px-3 py-2.5">
      <span class="mb-1.5 block text-[11px] font-medium tracking-wide text-foreground/50">Opacity</span>
      <OpacitySlider
        :model-value="currentOpacity"
        @update:model-value="onOpacityChange"
      />
    </div>

    <!-- Text controls (conditional) -->
    <template v-if="hasTextSelected">
      <div class="border-b border-edge/20 px-3 py-2.5">
        <span class="mb-1.5 block text-[11px] font-medium tracking-wide text-foreground/50">Text</span>
        <div class="flex flex-col gap-2">
          <div class="flex items-center gap-1.5">
            <FontPicker
              :model-value="currentFontFamily"
              @update:model-value="onFontFamilyChange"
            />
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
          </div>
          <ButtonIconSelect
            :options="textAlignOptions"
            :model-value="currentTextAlign"
            @update:model-value="onTextAlignChange"
          />
        </div>
      </div>
    </template>

    <!-- Arrow controls (conditional) -->
    <template v-if="hasArrowSelected">
      <div class="border-b border-edge/20 px-3 py-2.5">
        <span class="mb-1.5 block text-[11px] font-medium tracking-wide text-foreground/50">Arrowheads</span>
        <div class="flex flex-col gap-1.5">
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
        </div>
      </div>
    </template>

    <!-- Layers -->
    <div class="border-b border-edge/20 px-3 py-2.5">
      <span class="mb-1.5 block text-[11px] font-medium tracking-wide text-foreground/50">Layers</span>
      <div class="flex gap-0.5">
        <button
          aria-label="Send to back"
          class="flex h-7 w-7 items-center justify-center rounded text-xs transition-colors text-foreground/70 hover:bg-muted/20 hover:text-foreground"
          @click="emit('send-to-back')"
        >
          <svg aria-hidden="true" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <polyline points="7 14 12 19 17 14" />
            <line x1="5" y1="21" x2="19" y2="21" />
          </svg>
        </button>
        <button
          aria-label="Send backward"
          class="flex h-7 w-7 items-center justify-center rounded text-xs transition-colors text-foreground/70 hover:bg-muted/20 hover:text-foreground"
          @click="emit('send-backward')"
        >
          <svg aria-hidden="true" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="7" x2="12" y2="19" />
            <polyline points="7 14 12 19 17 14" />
          </svg>
        </button>
        <button
          aria-label="Bring forward"
          class="flex h-7 w-7 items-center justify-center rounded text-xs transition-colors text-foreground/70 hover:bg-muted/20 hover:text-foreground"
          @click="emit('bring-forward')"
        >
          <svg aria-hidden="true" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="17" x2="12" y2="5" />
            <polyline points="7 10 12 5 17 10" />
          </svg>
        </button>
        <button
          aria-label="Bring to front"
          class="flex h-7 w-7 items-center justify-center rounded text-xs transition-colors text-foreground/70 hover:bg-muted/20 hover:text-foreground"
          @click="emit('bring-to-front')"
        >
          <svg aria-hidden="true" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="7 10 12 5 17 10" />
            <line x1="5" y1="3" x2="19" y2="3" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Actions -->
    <div class="px-3 py-2.5">
      <span class="mb-1.5 block text-[11px] font-medium tracking-wide text-foreground/50">Actions</span>
      <div class="flex gap-0.5">
        <button
          aria-label="Duplicate"
          class="flex h-7 w-7 items-center justify-center rounded text-xs transition-colors text-foreground/70 hover:bg-muted/20 hover:text-foreground"
          @click="emit('duplicate')"
        >
          <svg aria-hidden="true" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </button>
        <button
          aria-label="Delete"
          class="flex h-7 w-7 items-center justify-center rounded text-xs transition-colors text-foreground/70 hover:bg-muted/20 hover:text-foreground"
          @click="emit('delete')"
        >
          <svg aria-hidden="true" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
