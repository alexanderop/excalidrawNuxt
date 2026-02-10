<script setup lang="ts">
import { ref, computed, useTemplateRef } from 'vue'
import { useElementBounding, useWindowSize } from '@vueuse/core'
import ColorPicker from './ColorPicker.vue'

const { color, label } = defineProps<{
  color: string
  label: string
}>()

const emit = defineEmits<{
  'update:color': [color: string]
}>()

const isPickerOpen = ref(false)
const swatchEl = useTemplateRef<HTMLElement>('swatchEl')

const { top: rectTop, right: rectRight, left: rectLeft, bottom: rectBottom } = useElementBounding(swatchEl)
const { width: windowWidth, height: windowHeight } = useWindowSize()

const isTransparent = computed(() => color === 'transparent')
const isMixed = computed(() => color === 'mixed')

const swatchStyle = computed(() => {
  if (isTransparent.value || isMixed.value) return {}
  return { backgroundColor: color }
})

const pickerPosition = computed(() => {
  const pickerWidth = 256 // w-64 = 16rem = 256px
  const pickerHeight = 300 // approximate

  // Primary: open to the right of the swatch
  let left = rectRight.value + 8
  let top = rectTop.value

  // Fallback: if would overflow right edge, open below instead
  if (left + pickerWidth > windowWidth.value) {
    left = rectLeft.value
    top = rectBottom.value + 6
  }

  // Clamp vertically to stay on screen
  if (top + pickerHeight > windowHeight.value) {
    top = windowHeight.value - pickerHeight - 8
  }
  if (top < 8) {
    top = 8
  }

  // Clamp horizontally
  if (left + pickerWidth > windowWidth.value) {
    left = windowWidth.value - pickerWidth - 8
  }

  return { top, left }
})

function togglePicker(): void {
  isPickerOpen.value = !isPickerOpen.value
}
</script>

<template>
  <div ref="swatchEl" class="relative">
    <button
      :aria-label="label"
      :title="label"
      class="relative flex h-7 w-7 items-center justify-center rounded border transition-colors"
      :class="isPickerOpen ? 'border-accent' : 'border-edge/40 hover:border-edge'"
      @click="togglePicker"
    >
      <!-- Checkerboard for transparent -->
      <span
        v-if="isTransparent"
        class="absolute inset-0.5 rounded-sm"
        style="background-image: repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%); background-size: 6px 6px;"
      />
      <!-- Diagonal line over checkerboard for transparent -->
      <svg
        v-if="isTransparent"
        class="relative h-full w-full"
        viewBox="0 0 24 24"
      >
        <line
          x1="4"
          y1="20"
          x2="20"
          y2="4"
          stroke="red"
          stroke-width="2"
        />
      </svg>
      <!-- Question mark for mixed -->
      <span
        v-else-if="isMixed"
        class="text-xs font-bold text-foreground/50"
      >?</span>
      <!-- Color swatch -->
      <span
        v-else
        class="absolute inset-0.5 rounded-sm"
        :style="swatchStyle"
      />
    </button>

    <ColorPicker
      :model-value="color === 'mixed' ? '#000000' : color"
      :is-open="isPickerOpen"
      :position-top="pickerPosition.top"
      :position-left="pickerPosition.left"
      @update:model-value="(c: string) => emit('update:color', c)"
      @close="isPickerOpen = false"
    />
  </div>
</template>
