<script setup lang="ts">
import { watch } from "vue";
import { usePersistence } from "./usePersistence";

defineSlots<{ default?: () => unknown }>();
const emit = defineEmits<{ restored: [] }>();
const { isRestored } = usePersistence();

watch(
  isRestored,
  (value) => {
    if (value) emit("restored");
  },
  { immediate: true },
);
</script>

<template>
  <slot />
</template>
