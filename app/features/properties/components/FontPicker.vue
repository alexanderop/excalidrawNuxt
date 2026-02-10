<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { onClickOutside, useToggle } from '@vueuse/core'

const { modelValue } = defineProps<{
  modelValue: number | 'mixed'
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const [isOpen, toggleOpen] = useToggle(false)
const dropdownRef = useTemplateRef<HTMLElement>('dropdownEl')

onClickOutside(dropdownRef, () => {
  toggleOpen(false)
})

const fontOptions = [
  { label: 'Virgil', value: 1, style: 'font-family: Virgil, cursive' },
  { label: 'Helvetica', value: 2, style: 'font-family: Helvetica, Arial, sans-serif' },
  { label: 'Cascadia', value: 3, style: 'font-family: Cascadia, monospace' },
] as const

const currentLabel = computed((): string => {
  if (modelValue === 'mixed') return 'Mixed'
  const found = fontOptions.find(o => o.value === modelValue)
  return found?.label ?? 'Virgil'
})

function select(value: number): void {
  emit('update:modelValue', value)
  toggleOpen(false)
}
</script>

<template>
  <div
    ref="dropdownEl"
    class="relative"
    @keydown.escape="toggleOpen(false)"
  >
    <button
      aria-haspopup="listbox"
      :aria-expanded="isOpen"
      class="flex h-7 items-center gap-1 rounded px-1.5 text-xs transition-colors text-foreground/70 hover:bg-muted/20 hover:text-foreground"
      @click="toggleOpen()"
    >
      <span>{{ currentLabel }}</span>
      <svg
        aria-hidden="true"
        class="h-3 w-3"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>

    <div
      v-if="isOpen"
      role="listbox"
      class="absolute top-full left-0 mt-1 min-w-[120px] rounded-md border border-edge/40 bg-surface/95 py-0.5 shadow-lg backdrop-blur-md"
    >
      <button
        v-for="option in fontOptions"
        :key="option.value"
        role="option"
        :aria-selected="modelValue === option.value"
        class="flex w-full items-center px-2.5 py-1 text-left text-xs transition-colors"
        :class="modelValue === option.value
          ? 'bg-accent/20 text-accent'
          : 'text-foreground/70 hover:bg-muted/20 hover:text-foreground'"
        :style="option.style"
        @click="select(option.value)"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>
