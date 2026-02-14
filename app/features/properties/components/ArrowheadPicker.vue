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
    label: "Circle",
    value: "circle",
    icon: '<line x1="4" y1="12" x2="16" y2="12"/><circle cx="19" cy="12" r="3"/>',
  },
  {
    label: "Circle outline",
    value: "circle_outline",
    icon: '<line x1="4" y1="12" x2="16" y2="12"/><circle cx="19" cy="12" r="3" fill="white" stroke="currentColor"/>',
  },
  {
    label: "Triangle",
    value: "triangle",
    icon: '<line x1="4" y1="12" x2="15" y2="12"/><polygon points="15 7 22 12 15 17" fill="currentColor"/>',
  },
  {
    label: "Triangle outline",
    value: "triangle_outline",
    icon: '<line x1="4" y1="12" x2="15" y2="12"/><polygon points="15 7 22 12 15 17" fill="white" stroke="currentColor"/>',
  },
  {
    label: "Diamond",
    value: "diamond",
    icon: '<line x1="4" y1="12" x2="13" y2="12"/><polygon points="16 6 22 12 16 18 10 12" fill="currentColor"/>',
  },
  {
    label: "Diamond outline",
    value: "diamond_outline",
    icon: '<line x1="4" y1="12" x2="13" y2="12"/><polygon points="16 6 22 12 16 18 10 12" fill="white" stroke="currentColor"/>',
  },
  {
    label: "Crowfoot one",
    value: "crowfoot_one",
    icon: '<line x1="4" y1="12" x2="17" y2="12"/><line x1="20" y1="7" x2="20" y2="17"/>',
  },
  {
    label: "Crowfoot many",
    value: "crowfoot_many",
    icon: '<line x1="4" y1="12" x2="20" y2="12"/><line x1="20" y1="12" x2="15" y2="7"/><line x1="20" y1="12" x2="15" y2="17"/>',
  },
  {
    label: "Crowfoot one or many",
    value: "crowfoot_one_or_many",
    icon: '<line x1="4" y1="12" x2="20" y2="12"/><line x1="20" y1="12" x2="15" y2="7"/><line x1="20" y1="12" x2="15" y2="17"/><line x1="17" y1="7" x2="17" y2="17"/>',
  },
];

function isActive(optionValue: Arrowhead | null): boolean {
  if (modelValue === "mixed") return false;
  return modelValue === optionValue;
}
</script>

<template>
  <div class="flex flex-col gap-0.5">
    <span class="text-[10px] text-foreground/40">{{ label }}</span>
    <div class="flex flex-wrap gap-0.5">
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
        <UTooltip :text="option.label" :content="{ side: 'bottom' }">
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
        </UTooltip>
      </UButton>
    </div>
  </div>
</template>
