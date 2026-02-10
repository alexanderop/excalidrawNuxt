<script setup lang="ts">
import { useToolStore } from '../useTool'
import { TOOL_ICONS } from './toolIcons'
import type { ToolType } from '../types'
import { useTheme } from '~/features/theme'

const { activeTool, setTool } = useToolStore()
const { isDark, toggleTheme } = useTheme()

defineExpose({})

const tools: Array<{ type: ToolType; label: string; shortcutNumber: number | null }> = [
  { type: 'hand', label: 'Hand', shortcutNumber: null },
  { type: 'selection', label: 'Selection', shortcutNumber: 1 },
  { type: 'rectangle', label: 'Rectangle', shortcutNumber: 2 },
  { type: 'diamond', label: 'Diamond', shortcutNumber: 3 },
  { type: 'ellipse', label: 'Ellipse', shortcutNumber: 4 },
  { type: 'arrow', label: 'Arrow', shortcutNumber: 5 },
  { type: 'text', label: 'Text', shortcutNumber: 6 },
  { type: 'code', label: 'Code', shortcutNumber: 7 },
  { type: 'line', label: 'Line', shortcutNumber: 8 },
  { type: 'image', label: 'Image', shortcutNumber: 9 },
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
        @click="setTool(tool.type)"
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

      <!-- Divider -->
      <div class="mx-0.5 w-px self-stretch bg-edge/30" />

      <!-- Theme toggle -->
      <button
        :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
        :aria-pressed="isDark"
        class="flex h-9 w-9 items-center justify-center rounded-md text-foreground/70 transition-colors hover:bg-muted/20 hover:text-foreground"
        @click="toggleTheme"
      >
        <!-- Moon icon (shown in light mode) -->
        <svg
          v-if="!isDark"
          aria-hidden="true"
          class="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
        <!-- Sun icon (shown in dark mode) -->
        <svg
          v-else
          aria-hidden="true"
          class="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      </button>
    </div>
    <p class="text-xs text-foreground/40">
      To move canvas, hold Scroll wheel or Space while dragging, or use the hand tool
    </p>
  </div>
</template>
