<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { onClickOutside } from '@vueuse/core'
import type { ContextMenuItem, ContextMenuItemBase, ContextMenuContext } from '../types'
import { isSeparator } from '../types'

const { isOpen, position, items, context } = defineProps<{
  isOpen: boolean
  position: { x: number; y: number }
  items: ContextMenuItem[]
  context: ContextMenuContext
}>()

const emit = defineEmits<{
  close: []
}>()

const menuRef = useTemplateRef<HTMLDivElement>('contextMenuEl')

const positionStyle = computed(() => ({
  left: `${position.x}px`,
  top: `${position.y}px`,
}))

function handleClick(item: ContextMenuItemBase): void {
  item.action(context)
  emit('close')
}

// Click-away: close when clicking outside the menu
onClickOutside(menuRef, () => {
  emit('close')
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      ref="contextMenuEl"
      class="fixed z-50 min-w-[200px] rounded-lg border border-edge bg-surface py-1 shadow-lg"
      :style="positionStyle"
    >
      <template v-for="(item, i) in items" :key="i">
        <hr
          v-if="isSeparator(item)"
          class="my-1 border-edge"
        >
        <button
          v-else
          class="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm text-foreground hover:bg-foreground/10"
          @click="handleClick(item)"
        >
          <span>{{ item.label }}</span>
          <kbd
            v-if="item.shortcut"
            class="ml-4 text-xs text-muted"
          >{{ item.shortcut }}</kbd>
        </button>
      </template>
    </div>
  </Teleport>
</template>
