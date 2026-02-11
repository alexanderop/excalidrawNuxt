<script setup lang="ts">
const model = defineModel<number>({ required: true });
</script>

<template>
  <div class="flex items-center gap-2">
    <USlider
      v-model="model"
      :min="0"
      :max="100"
      :step="1"
      size="sm"
      class="flex-1"
      :ui="{
        track: 'bg-edge/30',
        range: 'bg-accent',
        thumb: 'ring-accent bg-foreground',
      }"
    />
    <span class="w-8 shrink-0 text-right text-xs text-foreground/70">{{ model }}%</span>
  </div>
</template>
