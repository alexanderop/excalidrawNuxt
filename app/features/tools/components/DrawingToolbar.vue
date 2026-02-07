<script setup lang="ts">
import type { ToolType } from '../types'
import { TOOL_ICONS } from './toolIcons'

const { activeTool, onSetTool } = defineProps<{
  activeTool: ToolType
  onSetTool: (tool: ToolType) => void
}>()

defineExpose({})

const tools: Array<{ type: ToolType; label: string; shortcutNumber: number | null }> = [
  { type: 'hand', label: 'Hand', shortcutNumber: null },
  { type: 'selection', label: 'Selection', shortcutNumber: 1 },
  { type: 'rectangle', label: 'Rectangle', shortcutNumber: 2 },
  { type: 'diamond', label: 'Diamond', shortcutNumber: 3 },
  { type: 'ellipse', label: 'Ellipse', shortcutNumber: 4 },
  { type: 'arrow', label: 'Arrow', shortcutNumber: 5 },
]
</script>

<template>
  <div class="absolute top-4 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2">
    <div class="flex gap-0.5 rounded-lg border border-edge/40 bg-surface/80 p-1 shadow-lg backdrop-blur-md">
      <button
        v-for="tool in tools"
        :key="tool.type"
        :aria-label="tool.label"
        :aria-pressed="activeTool === tool.type"
        class="relative flex h-9 w-9 items-center justify-center rounded-md transition-colors"
        :class="activeTool === tool.type
          ? 'bg-accent/20 text-accent'
          : 'text-foreground/70 hover:bg-muted/20 hover:text-foreground'"
        @click="onSetTool(tool.type)"
      >
        <svg
          aria-hidden="true"
          class="h-5 w-5"
          :viewBox="TOOL_ICONS[tool.type].viewBox"
          v-html="TOOL_ICONS[tool.type].paths"
        />
        <span
          v-if="tool.shortcutNumber !== null"
          class="absolute right-0.5 bottom-0 text-[10px] opacity-40"
        >
          {{ tool.shortcutNumber }}
        </span>
      </button>
    </div>
    <p class="text-xs text-foreground/40">
      To move canvas, hold Scroll wheel or Space while dragging, or use the hand tool
    </p>
  </div>
</template>
