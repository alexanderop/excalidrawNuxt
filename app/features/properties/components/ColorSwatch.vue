<script setup lang="ts">
import { ref, computed, useTemplateRef } from 'vue'
import { useEventListener } from '@vueuse/core'
import ColorPicker from './ColorPicker.vue'

const { color, label } = defineProps<{
  color: string
  label: string
}>()

const emit = defineEmits<{
  click: []
  'update:color': [color: string]
}>()

const isPickerOpen = ref(false)
const swatchEl = useTemplateRef<HTMLElement>('swatchEl')
const pickerPosition = ref({ top: 0, left: 0 })

const isTransparent = computed(() => color === 'transparent')
const isMixed = computed(() => color === 'mixed')

const swatchStyle = computed(() => {
  if (isTransparent.value || isMixed.value) return {}
  return { backgroundColor: color }
})

function togglePicker(): void {
  if (isPickerOpen.value) {
    isPickerOpen.value = false
    return
  }
  updatePickerPosition()
  isPickerOpen.value = true
  emit('click')
}

function updatePickerPosition(): void {
  if (!swatchEl.value) return
  const rect = swatchEl.value.getBoundingClientRect()
  const pickerWidth = 256 // w-64 = 16rem = 256px
  const pickerHeight = 300 // approximate

  let top = rect.bottom + 6
  let left = rect.left

  // Flip above if near bottom
  if (top + pickerHeight > window.innerHeight) {
    top = rect.top - pickerHeight - 6
  }

  // Clamp horizontally
  if (left + pickerWidth > window.innerWidth) {
    left = window.innerWidth - pickerWidth - 8
  }

  pickerPosition.value = { top, left }
}

function onColorSelect(newColor: string): void {
  emit('update:color', newColor)
}

function closePicker(): void {
  isPickerOpen.value = false
}

// Recalculate position on scroll/resize while open
function onReposition(): void {
  if (isPickerOpen.value) updatePickerPosition()
}

useEventListener(globalThis, 'resize', onReposition)
useEventListener(globalThis, 'scroll', onReposition, { capture: true })
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
      @update:model-value="onColorSelect"
      @close="closePicker"
    />
  </div>
</template>
