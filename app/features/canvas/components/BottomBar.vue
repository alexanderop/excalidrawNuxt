<script setup lang="ts">
const { zoom, canUndo, canRedo } = defineProps<{
  zoom: number;
  canUndo: boolean;
  canRedo: boolean;
}>();

const emit = defineEmits<{
  "zoom-in": [];
  "zoom-out": [];
  "zoom-reset": [];
  undo: [];
  redo: [];
}>();

const BTN =
  "flex h-8 w-8 items-center justify-center text-foreground/60 transition-colors hover:text-foreground disabled:opacity-30 disabled:hover:text-foreground/60";
</script>

<template>
  <div class="absolute bottom-4 left-4 z-10 flex items-center gap-2">
    <!-- Zoom controls -->
    <div
      class="flex items-center rounded-lg border border-edge/40 bg-surface/80 shadow-lg backdrop-blur-md"
    >
      <UTooltip text="Zoom out" :content="{ side: 'top' }">
        <button :class="BTN" aria-label="Zoom out" @click="emit('zoom-out')">
          <svg
            aria-hidden="true"
            class="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </UTooltip>

      <UTooltip text="Reset zoom" :content="{ side: 'top' }">
        <button
          class="min-w-[3.5rem] px-1 py-1 text-center font-mono text-xs text-foreground/60 transition-colors hover:text-foreground"
          aria-label="Reset zoom"
          @click="emit('zoom-reset')"
        >
          {{ Math.round(zoom * 100) }}%
        </button>
      </UTooltip>

      <UTooltip text="Zoom in" :content="{ side: 'top' }">
        <button :class="BTN" aria-label="Zoom in" @click="emit('zoom-in')">
          <svg
            aria-hidden="true"
            class="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </UTooltip>
    </div>

    <!-- Undo/Redo controls -->
    <div
      class="flex items-center rounded-lg border border-edge/40 bg-surface/80 shadow-lg backdrop-blur-md"
    >
      <UTooltip text="Undo" :kbds="['meta', 'Z']" :content="{ side: 'top' }">
        <button :class="BTN" :disabled="!canUndo" aria-label="Undo" @click="emit('undo')">
          <svg
            aria-hidden="true"
            class="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M3 7v6h6" />
            <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
          </svg>
        </button>
      </UTooltip>

      <UTooltip text="Redo" :kbds="['meta', 'shift', 'Z']" :content="{ side: 'top' }">
        <button :class="BTN" :disabled="!canRedo" aria-label="Redo" @click="emit('redo')">
          <svg
            aria-hidden="true"
            class="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M21 7v6h-6" />
            <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
          </svg>
        </button>
      </UTooltip>
    </div>
  </div>
</template>
