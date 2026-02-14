<script setup lang="ts">
import type { Arrowhead } from "@drawvue/core";

const { modelValue, label } = defineProps<{
  modelValue: Arrowhead | null | "mixed";
  label: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: Arrowhead | null];
}>();

const arrowheadOptions: { label: string; value: Arrowhead | null; icon: string }[] = [
  {
    label: "None",
    value: null,
    icon: '<line x1="4" y1="12" x2="20" y2="12"/>',
  },
  {
    label: "Arrow",
    value: "arrow",
    icon: '<line x1="4" y1="12" x2="20" y2="12"/><polyline points="15 7 20 12 15 17"/>',
  },
  {
    label: "Bar",
    value: "bar",
    icon: '<line x1="4" y1="12" x2="20" y2="12"/><line x1="20" y1="7" x2="20" y2="17"/>',
  },
  {
    label: "Dot",
    value: "dot",
    icon: '<line x1="4" y1="12" x2="16" y2="12"/><circle cx="19" cy="12" r="3" fill="currentColor"/>',
  },
  {
    label: "Triangle",
    value: "triangle",
    icon: '<line x1="4" y1="12" x2="15" y2="12"/><polygon points="15 7 22 12 15 17" fill="currentColor"/>',
  },
  {
    label: "Diamond",
    value: "diamond",
    icon: '<line x1="4" y1="12" x2="13" y2="12"/><polygon points="16 6 22 12 16 18 10 12" fill="currentColor"/>',
  },
];

function isActive(optionValue: Arrowhead | null): boolean {
  if (modelValue === "mixed") return false;
  return modelValue === optionValue;
}
</script>

<template>
  <div class="flex items-center gap-0.5">
    <span class="mr-0.5 text-[10px] text-foreground/40">{{ label }}</span>
    <UButton
      v-for="option in arrowheadOptions"
      :key="String(option.value)"
      variant="ghost"
      color="neutral"
      size="xs"
      square
      :aria-label="`${label} arrowhead: ${option.label}`"
      :aria-pressed="isActive(option.value)"
      :class="
        isActive(option.value)
          ? 'bg-accent/20 text-accent hover:bg-accent/30'
          : 'text-foreground/70 hover:bg-subdued/20 hover:text-foreground'
      "
      @click="emit('update:modelValue', option.value)"
    >
      <svg
        aria-hidden="true"
        class="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        v-html="option.icon"
      />
    </UButton>
  </div>
</template>
