<script setup lang="ts">
interface Option {
  label: string;
  value: string | number;
  icon?: string;
}

const { options, modelValue } = defineProps<{
  options: Option[];
  modelValue: string | number | "mixed" | null;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string | number];
}>();

function isActive(optionValue: string | number): boolean {
  if (modelValue === "mixed" || modelValue === null) return false;
  return modelValue === optionValue;
}
</script>

<template>
  <div class="flex gap-0.5">
    <UButton
      v-for="option in options"
      :key="option.value"
      variant="ghost"
      color="neutral"
      size="xs"
      square
      :aria-label="option.label"
      :aria-pressed="isActive(option.value)"
      :class="
        isActive(option.value)
          ? 'bg-accent/20 text-accent hover:bg-accent/30'
          : 'text-foreground/70 hover:bg-subdued/20 hover:text-foreground'
      "
      @click="emit('update:modelValue', option.value)"
    >
      <svg
        v-if="option.icon"
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
      <span v-else class="leading-none">{{ option.label }}</span>
    </UButton>
  </div>
</template>
