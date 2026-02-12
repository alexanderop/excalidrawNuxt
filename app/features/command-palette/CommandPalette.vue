<script setup lang="ts">
import { computed } from "vue";
import { defineShortcuts } from "#imports";
import { useCommandPalette } from "./useCommandPalette";
import { COMMAND_GROUP_DEFS } from "./commandGroups";
import { useActionRegistry } from "~/shared/useActionRegistry";

defineExpose({});

const { isOpen, execute } = useCommandPalette();
const { get, isEnabled } = useActionRegistry();

defineShortcuts({
  meta_k: {
    handler: () => {
      isOpen.value = !isOpen.value;
    },
    usingInput: true,
  },
});

const groups = computed(() =>
  COMMAND_GROUP_DEFS.map((group) => ({
    id: group.id,
    label: group.label,
    items: group.actionIds
      .map((actionId) => {
        const action = get(actionId);
        if (!action) return null;
        return {
          id: action.id,
          label: action.label,
          icon: action.icon,
          kbds: action.kbds ? [...action.kbds] : undefined,
          disabled: !isEnabled(actionId),
          onSelect: () => execute(action.id),
        };
      })
      .filter((item) => item !== null),
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
