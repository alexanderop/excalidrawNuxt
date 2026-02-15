<script setup lang="ts">
import { computed, ref, nextTick } from "vue";
import { useDrawVue, useTheme } from "@drawvue/core";
import type { ExcalidrawElement } from "@drawvue/core";

const ctx = useDrawVue();
const { theme } = useTheme();

const h = (globalThis as unknown as Record<string, Record<string, unknown>>).__h;

const activeTool = computed(() => (h?.activeTool as { value: string })?.value ?? "selection");
const scrollX = computed(() => (h?.scrollX as { value: number })?.value ?? 0);
const scrollY = computed(() => (h?.scrollY as { value: number })?.value ?? 0);
const zoom = computed(() => (h?.zoom as { value: number })?.value ?? 1);
const selectedIds = computed(
  () => (h?.selectedIds as { value: ReadonlySet<string> })?.value ?? new Set<string>(),
);
const selectedElements = computed(
  () =>
    ((h?.selectedElements as { value: readonly ExcalidrawElement[] })?.value ??
      []) as readonly ExcalidrawElement[],
);
const newElement = computed(
  () => (h?.newElement as { value: ExcalidrawElement | null })?.value ?? null,
);
const multiElement = computed(
  () => (h?.multiElement as { value: ExcalidrawElement | null })?.value ?? null,
);
const editingTextElement = computed(
  () => (h?.editingTextElement as { value: ExcalidrawElement | null })?.value ?? null,
);

const openSections = ref(new Set(["tool", "viewport", "selection", "clipboard", "style"]));

function toggleSection(id: string): void {
  if (openSections.value.has(id)) {
    openSections.value.delete(id);
    return;
  }
  openSections.value.add(id);
}

const flashingKey = ref<string | null>(null);

async function flashValue(key: string): Promise<void> {
  flashingKey.value = null;
  await nextTick();
  flashingKey.value = key;
  setTimeout(() => {
    flashingKey.value = null;
  }, 600);
}

const SECTION_ICONS = {
  tool: {
    svg: "M3 3l7.07 16.97 2.51-7.39 7.39-2.51z",
    classes: "bg-accent/15 text-accent",
  },
  viewport: {
    svg: "M2 3h20v14H2zM8 21h8m-4-4v4",
    classes: "bg-blue-400/[0.12] text-blue-400",
  },
  selection: {
    svg: "M3 3h18v18H3zM8 8h8v8H8z",
    classes: "bg-green-400/[0.12] text-green-400",
  },
  clipboard: {
    svg: "M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2M8 2h8v4H8z",
    classes: "bg-amber-400/[0.12] text-amber-400",
  },
  style: {
    svg: "M12 2.69l5.66 5.66a8 8 0 11-11.31 0z",
    classes: "bg-orange-400/[0.12] text-orange-400",
  },
};

const selectionBounds = computed(() => {
  if (selectedElements.value.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const el of selectedElements.value) {
    minX = Math.min(minX, el.x);
    minY = Math.min(minY, el.y);
    maxX = Math.max(maxX, el.x + el.width);
    maxY = Math.max(maxY, el.y + el.height);
  }
  return {
    x1: Math.round(minX),
    y1: Math.round(minY),
    x2: Math.round(maxX),
    y2: Math.round(maxY),
  };
});

const nonDeletedCount = computed(
  () => ctx.elements.elements.value.filter((el) => !el.isDeleted).length,
);
</script>

<template>
  <div class="flex flex-col gap-0.5 p-1.5">
    <!-- Tool section -->
    <div class="overflow-hidden rounded-md">
      <div
        class="flex cursor-pointer select-none items-center gap-[7px] px-2 py-[7px] transition-colors hover:bg-white/[0.03]"
        @click="toggleSection('tool')"
      >
        <div
          class="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[5px]"
          :class="SECTION_ICONS.tool.classes"
        >
          <svg
            class="h-3 w-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path :d="SECTION_ICONS.tool.svg" />
          </svg>
        </div>
        <span class="flex-1 text-[11px] font-semibold uppercase tracking-wide text-foreground/60"
          >Tool</span
        >
        <svg
          class="h-3.5 w-3.5 text-foreground/30 transition-transform duration-200"
          :class="{ 'rotate-90': openSections.has('tool') }"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>
      <div v-if="openSections.has('tool')" class="space-y-0 px-2 pb-2 pl-9">
        <div class="flex items-center justify-between border-b border-white/[0.02] py-[3px]">
          <span class="text-[11px] text-foreground/40">activeTool</span>
          <span
            class="cursor-pointer rounded px-1 py-px font-mono text-[11px] font-medium text-accent transition-colors hover:bg-surface"
            :class="{ 'animate-flash-val': flashingKey === 'tool.activeTool' }"
            @click="flashValue('tool.activeTool')"
          >
            {{ activeTool }}
          </span>
        </div>
        <div class="flex items-center justify-between border-b border-white/[0.02] py-[3px]">
          <span class="text-[11px] text-foreground/40">newElement</span>
          <span
            class="cursor-pointer rounded px-1 py-px font-mono text-[11px] transition-colors hover:bg-surface"
            :class="newElement ? 'font-medium text-foreground' : 'italic text-foreground/30'"
            @click="flashValue('tool.newElement')"
          >
            {{ newElement ? `${newElement.type} (${newElement.id.slice(0, 6)})` : "null" }}
          </span>
        </div>
        <div class="flex items-center justify-between border-b border-white/[0.02] py-[3px]">
          <span class="text-[11px] text-foreground/40">multiElement</span>
          <span
            class="cursor-pointer rounded px-1 py-px font-mono text-[11px] transition-colors hover:bg-surface"
            :class="multiElement ? 'font-medium text-foreground' : 'italic text-foreground/30'"
            @click="flashValue('tool.multiElement')"
          >
            {{ multiElement ? multiElement.id.slice(0, 6) : "null" }}
          </span>
        </div>
        <div class="flex items-center justify-between py-[3px]">
          <span class="text-[11px] text-foreground/40">editingText</span>
          <span
            class="cursor-pointer rounded px-1 py-px font-mono text-[11px] transition-colors hover:bg-surface"
            :class="
              editingTextElement ? 'font-medium text-foreground' : 'italic text-foreground/30'
            "
            @click="flashValue('tool.editingText')"
          >
            {{ editingTextElement ? editingTextElement.id.slice(0, 6) : "null" }}
          </span>
        </div>
      </div>
    </div>

    <!-- Viewport section -->
    <div class="overflow-hidden rounded-md">
      <div
        class="flex cursor-pointer select-none items-center gap-[7px] px-2 py-[7px] transition-colors hover:bg-white/[0.03]"
        @click="toggleSection('viewport')"
      >
        <div
          class="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[5px]"
          :class="SECTION_ICONS.viewport.classes"
        >
          <svg
            class="h-3 w-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path :d="SECTION_ICONS.viewport.svg" />
          </svg>
        </div>
        <span class="flex-1 text-[11px] font-semibold uppercase tracking-wide text-foreground/60"
          >Viewport</span
        >
        <svg
          class="h-3.5 w-3.5 text-foreground/30 transition-transform duration-200"
          :class="{ 'rotate-90': openSections.has('viewport') }"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>
      <div v-if="openSections.has('viewport')" class="space-y-0 px-2 pb-2 pl-9">
        <div class="flex items-center justify-between border-b border-white/[0.02] py-[3px]">
          <span class="text-[11px] text-foreground/40">scroll</span>
          <span
            class="cursor-pointer rounded px-1 py-px font-mono text-[11px] font-medium text-foreground transition-colors hover:bg-surface"
            :class="{ 'animate-flash-val': flashingKey === 'viewport.scroll' }"
            @click="flashValue('viewport.scroll')"
          >
            {{ Math.round(scrollX) }}, {{ Math.round(scrollY) }}
          </span>
        </div>
        <div class="flex items-center justify-between border-b border-white/[0.02] py-[3px]">
          <span class="text-[11px] text-foreground/40">zoom</span>
          <span
            class="cursor-pointer rounded px-1 py-px font-mono text-[11px] font-medium text-foreground transition-colors hover:bg-surface"
            @click="flashValue('viewport.zoom')"
          >
            {{ Math.round(zoom * 100) }}%
          </span>
        </div>
        <div class="flex items-center justify-between py-[3px]">
          <span class="text-[11px] text-foreground/40">elements</span>
          <span
            class="cursor-pointer rounded px-1 py-px font-mono text-[11px] font-medium text-foreground transition-colors hover:bg-surface"
            @click="flashValue('viewport.elements')"
          >
            {{ nonDeletedCount }}
          </span>
        </div>
      </div>
    </div>

    <!-- Selection section -->
    <div class="overflow-hidden rounded-md">
      <div
        class="flex cursor-pointer select-none items-center gap-[7px] px-2 py-[7px] transition-colors hover:bg-white/[0.03]"
        @click="toggleSection('selection')"
      >
        <div
          class="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[5px]"
          :class="SECTION_ICONS.selection.classes"
        >
          <svg
            class="h-3 w-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path :d="SECTION_ICONS.selection.svg" />
          </svg>
        </div>
        <span class="flex-1 text-[11px] font-semibold uppercase tracking-wide text-foreground/60"
          >Selection</span
        >
        <svg
          class="h-3.5 w-3.5 text-foreground/30 transition-transform duration-200"
          :class="{ 'rotate-90': openSections.has('selection') }"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>
      <div v-if="openSections.has('selection')" class="space-y-0 px-2 pb-2 pl-9">
        <div class="flex items-center justify-between border-b border-white/[0.02] py-[3px]">
          <span class="text-[11px] text-foreground/40">count</span>
          <span
            class="cursor-pointer rounded px-1 py-px font-mono text-[11px] font-medium transition-colors hover:bg-surface"
            :class="selectedIds.size > 0 ? 'text-green-400' : 'text-foreground'"
            @click="flashValue('selection.count')"
          >
            {{ selectedIds.size }}
          </span>
        </div>
        <div
          v-if="selectedIds.size > 0"
          class="flex items-center justify-between border-b border-white/[0.02] py-[3px]"
        >
          <span class="text-[11px] text-foreground/40">IDs</span>
          <span
            class="max-w-[200px] cursor-pointer truncate rounded px-1 py-px font-mono text-[10px] font-medium text-foreground transition-colors hover:bg-surface"
            @click="flashValue('selection.ids')"
          >
            {{ [...selectedIds].map((id) => id.slice(0, 6)).join(", ") }}
          </span>
        </div>
        <div v-if="selectionBounds" class="flex items-center justify-between py-[3px]">
          <span class="text-[11px] text-foreground/40">bounds</span>
          <span
            class="cursor-pointer rounded px-1 py-px font-mono text-[10px] font-medium text-foreground transition-colors hover:bg-surface"
            @click="flashValue('selection.bounds')"
          >
            [{{ selectionBounds.x1 }},{{ selectionBounds.y1 }},{{ selectionBounds.x2 }},{{
              selectionBounds.y2
            }}]
          </span>
        </div>
      </div>
    </div>

    <!-- Clipboard & Theme section -->
    <div class="overflow-hidden rounded-md">
      <div
        class="flex cursor-pointer select-none items-center gap-[7px] px-2 py-[7px] transition-colors hover:bg-white/[0.03]"
        @click="toggleSection('clipboard')"
      >
        <div
          class="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[5px]"
          :class="SECTION_ICONS.clipboard.classes"
        >
          <svg
            class="h-3 w-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path :d="SECTION_ICONS.clipboard.svg" />
          </svg>
        </div>
        <span class="flex-1 text-[11px] font-semibold uppercase tracking-wide text-foreground/60"
          >Clipboard & Theme</span
        >
        <svg
          class="h-3.5 w-3.5 text-foreground/30 transition-transform duration-200"
          :class="{ 'rotate-90': openSections.has('clipboard') }"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>
      <div v-if="openSections.has('clipboard')" class="space-y-0 px-2 pb-2 pl-9">
        <div class="flex items-center justify-between border-b border-white/[0.02] py-[3px]">
          <span class="text-[11px] text-foreground/40">clipboard</span>
          <span
            class="cursor-pointer rounded px-1 py-px font-mono text-[11px] transition-colors hover:bg-surface"
            :class="
              ctx.clipboard.clipboard.value.length > 0
                ? 'font-medium text-foreground'
                : 'italic text-foreground/30'
            "
            @click="flashValue('clipboard.clipboard')"
          >
            {{ ctx.clipboard.clipboard.value.length }} elements
          </span>
        </div>
        <div class="flex items-center justify-between border-b border-white/[0.02] py-[3px]">
          <span class="text-[11px] text-foreground/40">storedStyles</span>
          <span
            class="cursor-pointer rounded px-1 py-px font-mono text-[11px] transition-colors hover:bg-surface"
            :class="
              ctx.styleClipboard.hasStoredStyles.value
                ? 'font-medium text-foreground'
                : 'italic text-foreground/30'
            "
            @click="flashValue('clipboard.storedStyles')"
          >
            {{ ctx.styleClipboard.hasStoredStyles.value ? "yes" : "no" }}
          </span>
        </div>
        <div class="flex items-center justify-between py-[3px]">
          <span class="text-[11px] text-foreground/40">theme</span>
          <span
            class="cursor-pointer rounded px-1 py-px font-mono text-[11px] font-medium text-foreground transition-colors hover:bg-surface"
            @click="flashValue('clipboard.theme')"
          >
            {{ theme }}
          </span>
        </div>
      </div>
    </div>

    <!-- Style Defaults section -->
    <div class="overflow-hidden rounded-md">
      <div
        class="flex cursor-pointer select-none items-center gap-[7px] px-2 py-[7px] transition-colors hover:bg-white/[0.03]"
        @click="toggleSection('style')"
      >
        <div
          class="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[5px]"
          :class="SECTION_ICONS.style.classes"
        >
          <svg
            class="h-3 w-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path :d="SECTION_ICONS.style.svg" />
          </svg>
        </div>
        <span class="flex-1 text-[11px] font-semibold uppercase tracking-wide text-foreground/60"
          >Style Defaults</span
        >
        <svg
          class="h-3.5 w-3.5 text-foreground/30 transition-transform duration-200"
          :class="{ 'rotate-90': openSections.has('style') }"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>
      <div v-if="openSections.has('style')" class="space-y-0 px-2 pb-2 pl-9">
        <div class="flex items-center justify-between border-b border-white/[0.02] py-[3px]">
          <span class="text-[11px] text-foreground/40">stroke</span>
          <span
            class="flex cursor-pointer items-center gap-1.5 rounded px-1 py-px font-mono text-[10px] font-medium text-foreground transition-colors hover:bg-surface"
            @click="flashValue('style.stroke')"
          >
            <span
              class="inline-block h-2.5 w-2.5 rounded-sm border border-white/15"
              :style="{ backgroundColor: ctx.styleDefaults.strokeColor.value }"
            />
            {{ ctx.styleDefaults.strokeColor.value }}
          </span>
        </div>
        <div class="flex items-center justify-between border-b border-white/[0.02] py-[3px]">
          <span class="text-[11px] text-foreground/40">background</span>
          <span
            class="flex cursor-pointer items-center gap-1.5 rounded px-1 py-px font-mono text-[10px] font-medium text-foreground transition-colors hover:bg-surface"
            @click="flashValue('style.bg')"
          >
            <span
              class="inline-block h-2.5 w-2.5 rounded-sm border border-white/15"
              :style="{
                backgroundColor: ctx.styleDefaults.backgroundColor.value,
                borderStyle:
                  ctx.styleDefaults.backgroundColor.value === 'transparent' ? 'dashed' : 'solid',
              }"
            />
            {{ ctx.styleDefaults.backgroundColor.value }}
          </span>
        </div>
        <div class="flex items-center justify-between border-b border-white/[0.02] py-[3px]">
          <span class="text-[11px] text-foreground/40">fill</span>
          <span
            class="cursor-pointer rounded px-1 py-px font-mono text-[11px] font-medium text-foreground transition-colors hover:bg-surface"
            @click="flashValue('style.fill')"
          >
            {{ ctx.styleDefaults.fillStyle.value }}
          </span>
        </div>
        <div class="flex items-center justify-between border-b border-white/[0.02] py-[3px]">
          <span class="text-[11px] text-foreground/40">strokeW</span>
          <span
            class="cursor-pointer rounded px-1 py-px font-mono text-[11px] font-medium text-foreground transition-colors hover:bg-surface"
            @click="flashValue('style.strokeW')"
          >
            {{ ctx.styleDefaults.strokeWidth.value }}
          </span>
        </div>
        <div class="flex items-center justify-between border-b border-white/[0.02] py-[3px]">
          <span class="text-[11px] text-foreground/40">opacity</span>
          <span
            class="cursor-pointer rounded px-1 py-px font-mono text-[11px] font-medium text-foreground transition-colors hover:bg-surface"
            @click="flashValue('style.opacity')"
          >
            {{ ctx.styleDefaults.opacity.value }}%
          </span>
        </div>
        <div class="flex items-center justify-between py-[3px]">
          <span class="text-[11px] text-foreground/40">roughness</span>
          <span
            class="cursor-pointer rounded px-1 py-px font-mono text-[11px] font-medium text-foreground transition-colors hover:bg-surface"
            @click="flashValue('style.roughness')"
          >
            {{ ctx.styleDefaults.roughness.value }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes flash-val {
  0% {
    background: rgb(255 107 237 / 0.15);
    color: rgb(255 107 237);
  }
  100% {
    background: transparent;
  }
}

.animate-flash-val {
  animation: flash-val 0.6s ease-out;
}
</style>
