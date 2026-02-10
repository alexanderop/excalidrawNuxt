<script setup lang="ts">
const { modelValue } = defineProps<{
  modelValue: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

function onInput(event: Event): void {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', Number(target.value))
}
</script>

<template>
  <div class="flex items-center gap-2">
    <span class="text-xs text-foreground/60">Opacity</span>
    <input
      type="range"
      :value="modelValue"
      min="0"
      max="100"
      step="1"
      class="h-1 w-20 cursor-pointer appearance-none rounded-full bg-edge/30 accent-accent"
      @input="onInput"
    >
    <span class="w-8 text-right text-xs text-foreground/70">{{ modelValue }}%</span>
  </div>
</template>
