<script setup lang="ts">
import { computed } from "vue";

const { modelValue } = defineProps<{
  modelValue: number | "mixed";
}>();

const emit = defineEmits<{
  "update:modelValue": [value: number];
}>();

interface FontOption {
  label: string;
  value: number;
  style: string;
}

const fontOptions: FontOption[] = [
  { label: "Virgil", value: 1, style: "font-family: Virgil, cursive" },
  { label: "Helvetica", value: 2, style: "font-family: Helvetica, Arial, sans-serif" },
  { label: "Cascadia", value: 3, style: "font-family: Cascadia, monospace" },
];

const selected = computed({
  get: () => {
    if (modelValue === "mixed") return undefined;
    return fontOptions.find((o) => o.value === modelValue) ?? fontOptions[0];
  },
  set: (option: FontOption | FontOption[] | undefined) => {
    if (option && !Array.isArray(option)) {
      emit("update:modelValue", option.value);
    }
  },
});

const placeholder = computed(() => (modelValue === "mixed" ? "Mixed" : undefined));
</script>

<template>
  <USelectMenu
    v-model="selected"
    :items="fontOptions"
    :search-input="false"
    :placeholder="placeholder"
    size="xs"
    variant="ghost"
    :ui="{
      base: 'h-7 min-w-0 text-foreground/70 hover:bg-subdued/20 hover:text-foreground',
      content: 'bg-surface/95 border-edge/40 backdrop-blur-md',
      item: 'text-foreground/70 data-highlighted:bg-subdued/20 data-highlighted:text-foreground',
      itemLeadingIcon: 'text-accent',
    }"
  >
    <template #item-label="{ item }">
      <span :style="(item as FontOption).style">{{ (item as FontOption).label }}</span>
    </template>
  </USelectMenu>
</template>
