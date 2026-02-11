<script setup lang="ts">
import { computed } from 'vue'
import { useEventListener } from '@vueuse/core'
import { useCommandPalette } from './useCommandPalette'
import { COMMAND_GROUPS } from './commandGroups'

defineExpose({})

const { isOpen, execute } = useCommandPalette()

// Cmd+K / Ctrl+K toggle — works even when focused on an input
if (typeof document !== 'undefined') {
  useEventListener(document, 'keydown', (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.code === 'KeyK') {
      e.preventDefault()
      isOpen.value = !isOpen.value
    }
  })
}

const groups = computed(() =>
  COMMAND_GROUPS.map(group => ({
    id: group.id,
    label: group.label,
    items: group.items.map(item => ({
      ...item,
      onSelect() {
        execute(item.id)
      },
    })),
  })),
)
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
