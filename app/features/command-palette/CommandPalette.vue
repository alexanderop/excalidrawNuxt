<script setup lang="ts">
import { computed } from "vue";
import { defineShortcuts } from "#imports";
import { useCommandPalette } from "./useCommandPalette";
import { COMMAND_GROUPS } from "./commandGroups";

defineExpose({});

const { isOpen, execute } = useCommandPalette();

defineShortcuts({
  meta_k: {
    handler: () => {
      isOpen.value = !isOpen.value;
    },
    usingInput: true,
  },
});

const groups = computed(() =>
  COMMAND_GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    items: group.items.map((item) => ({
      ...item,
      onSelect() {
        execute(item.id);
      },
    })),
  })),
);
</script>

<template>
  <UModal v-model:open="isOpen">
    <template #content>
      <UCommandPalette
        :groups="groups"
        placeholder="Search commands..."
        close
        @update:open="isOpen = $event"
      />
    </template>
  </UModal>
</template>
