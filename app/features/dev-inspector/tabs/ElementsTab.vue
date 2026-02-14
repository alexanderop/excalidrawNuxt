<script setup lang="ts">
import { computed, ref } from "vue";
import type { ExcalidrawElement } from "@drawvue/core";

const { elements, selectedIds } = defineProps<{
  elements: readonly ExcalidrawElement[];
  selectedIds: ReadonlySet<string>;
}>();

const emit = defineEmits<{
  select: [id: string];
}>();

const filterType = ref<string>("all");
const expandedId = ref<string | null>(null);

// ── Type icon color mapping ────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  rectangle: "bg-blue-400/[0.12] text-blue-400",
  ellipse: "bg-amber-400/[0.12] text-amber-400",
  diamond: "bg-purple-400/[0.12] text-purple-400",
  arrow: "bg-green-400/[0.12] text-green-400",
  line: "bg-green-400/[0.12] text-green-400",
  text: "bg-red-400/[0.12] text-red-400",
  freedraw: "bg-orange-400/[0.12] text-orange-400",
  image: "bg-cyan-300/[0.12] text-cyan-300",
  code: "bg-violet-400/[0.12] text-violet-400",
};

// SVG paths per element type
const TYPE_SVG: Record<string, string> = {
  rectangle: "M3 3h18v18H3z",
  ellipse: "M12 4a8 6 0 100 12 8 6 0 000-12z",
  diamond: "M12 2l10 10-10 10L2 12z",
  arrow: "M5 12h14m-4-4l4 4-4 4",
  line: "M5 12h14",
  text: "M4 7V4h16v3M9 20h6M12 4v16",
  freedraw: "M3 17c3-4 6-8 9-6s3 8 6 4",
  image: "M3 3h18v18H3zM3 15l5-5 4 4 4-6 5 7",
  code: "M16 18l6-6-6-6M8 6l-6 6 6 6",
};

// Filter pill types with SVG icons
const FILTER_PILLS = [
  {
    type: "all",
    label: "All",
    svg: "M12 12m-1 0a1 1 0 102 0 1 1 0 10-2 0M6 12m-1 0a1 1 0 102 0 1 1 0 10-2 0M18 12m-1 0a1 1 0 102 0 1 1 0 10-2 0",
  },
  { type: "rectangle", label: "Rect", svg: "M3 3h18v18H3z" },
  { type: "ellipse", label: "Ellipse", svg: "M12 4a8 6 0 100 12 8 6 0 000-12z" },
  { type: "diamond", label: "Diamond", svg: "M12 2l10 10-10 10L2 12z" },
  { type: "arrow", label: "Arrow", svg: "M5 12h14m-4-4l4 4-4 4" },
  { type: "text", label: "Text", svg: "M4 7V4h16v3M9 20h6M12 4v16" },
  { type: "freedraw", label: "Draw", svg: "M3 17c3-4 6-8 9-6s3 8 6 4" },
] as const;

const nonDeletedElements = computed(() => elements.filter((el) => !el.isDeleted));

const deletedCount = computed(() => elements.filter((el) => el.isDeleted).length);

const availableTypes = computed(() => {
  const types = new Set(nonDeletedElements.value.map((el) => el.type));
  return types;
});

const filteredElements = computed(() => {
  if (filterType.value === "all") return nonDeletedElements.value;
  return nonDeletedElements.value.filter((el) => el.type === filterType.value);
});

function toggleExpand(id: string): void {
  expandedId.value = expandedId.value === id ? null : id;
}

function truncateId(id: string): string {
  return id.slice(0, 8);
}

// ── Minimap computation ────────────────────────────────────────────

function minimapPositions(currentId: string) {
  const els = nonDeletedElements.value;
  if (els.length === 0) return [];

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const el of els) {
    minX = Math.min(minX, el.x);
    minY = Math.min(minY, el.y);
    maxX = Math.max(maxX, el.x + el.width);
    maxY = Math.max(maxY, el.y + el.height);
  }

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const padding = 0.1;

  return els.map((el) => ({
    id: el.id,
    isCurrent: el.id === currentId,
    left: `${((el.x - minX) / rangeX) * (1 - 2 * padding) * 100 + padding * 100}%`,
    top: `${((el.y - minY) / rangeY) * (1 - 2 * padding) * 100 + padding * 100}%`,
    width: `${Math.max((el.width / rangeX) * (1 - 2 * padding) * 100, 4)}%`,
    height: `${Math.max((el.height / rangeY) * (1 - 2 * padding) * 100, 10)}%`,
  }));
}
</script>

<template>
  <div class="flex flex-col gap-0">
    <!-- Summary bar + filter pills -->
    <div class="flex items-center gap-2 border-b border-white/[0.04] px-2 py-1.5">
      <span class="font-mono text-[11px] text-foreground/60">
        Total:
        <strong class="font-semibold text-foreground">{{ nonDeletedElements.length }}</strong>
      </span>
      <span v-if="deletedCount > 0" class="font-mono text-[11px] text-foreground/40">
        +{{ deletedCount }} deleted
      </span>
      <!-- Type filter pills -->
      <div class="ml-auto flex items-center gap-1">
        <button
          v-for="pill in FILTER_PILLS"
          :key="pill.type"
          class="flex h-[22px] w-6 items-center justify-center rounded border transition-all"
          :class="
            filterType === pill.type
              ? 'border-accent text-accent bg-accent/15'
              : pill.type === 'all' || availableTypes.has(pill.type as ExcalidrawElement['type'])
                ? 'border-white/[0.06] text-foreground/40 hover:border-white/15 hover:text-foreground/60 hover:bg-surface'
                : 'border-white/[0.04] text-foreground/15 pointer-events-none'
          "
          :title="pill.label"
          @click="filterType = pill.type"
        >
          <svg
            class="h-[13px] w-[13px]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
          >
            <path :d="pill.svg" />
          </svg>
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-1.5">
      <div
        v-for="el in filteredElements"
        :key="el.id"
        class="mb-0.5 overflow-hidden rounded-md transition-all"
        :class="selectedIds.has(el.id) ? 'bg-accent/15 border border-accent/15' : ''"
      >
        <!-- Element row -->
        <div
          class="group flex cursor-pointer items-center gap-2 px-2 py-1.5 transition-colors hover:bg-white/[0.03]"
          @click="toggleExpand(el.id)"
        >
          <!-- Type icon (SVG) -->
          <div
            class="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[5px]"
            :class="TYPE_COLORS[el.type] ?? 'bg-foreground/10 text-foreground/50'"
          >
            <svg
              class="h-[14px] w-[14px]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
            >
              <path :d="TYPE_SVG[el.type] ?? 'M12 12m-8 0a8 8 0 1016 0 8 8 0 10-16 0'" />
            </svg>
          </div>

          <!-- Info -->
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <span class="font-mono text-[11px] font-medium text-foreground">{{
                truncateId(el.id)
              }}</span>
              <span
                v-if="selectedIds.has(el.id)"
                class="rounded bg-accent/15 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-accent"
              >
                selected
              </span>
            </div>
            <div class="mt-px font-mono text-[10px] text-foreground/40">
              ({{ Math.round(el.x) }}, {{ Math.round(el.y) }}) · {{ Math.round(el.width) }} ×
              {{ Math.round(el.height) }}
            </div>
          </div>

          <!-- Hover action buttons -->
          <div class="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              class="flex h-[22px] w-[22px] items-center justify-center rounded bg-surface text-foreground/60 transition-all hover:bg-accent/15 hover:text-accent"
              title="Select on canvas"
              @click.stop="emit('select', el.id)"
            >
              <svg
                class="h-[11px] w-[11px]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51z" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Expanded detail -->
        <div v-if="expandedId === el.id" class="px-2 pb-2 pl-10">
          <!-- Detail grid -->
          <div class="grid grid-cols-[80px_1fr] gap-x-2 gap-y-0.5 text-[10px]">
            <span class="py-0.5 text-foreground/40">id</span>
            <span class="py-0.5 font-mono text-foreground">{{ el.id }}</span>

            <span class="py-0.5 text-foreground/40">type</span>
            <span class="py-0.5 font-mono text-foreground">{{ el.type }}</span>

            <span class="py-0.5 text-foreground/40">version</span>
            <span class="py-0.5 font-mono text-foreground">{{ el.version }}</span>

            <span v-if="el.angle !== 0" class="py-0.5 text-foreground/40">angle</span>
            <span v-if="el.angle !== 0" class="py-0.5 font-mono text-foreground">{{
              el.angle.toFixed(3)
            }}</span>

            <span class="py-0.5 text-foreground/40">stroke</span>
            <span class="flex items-center gap-1.5 py-0.5 font-mono text-foreground">
              <span
                class="inline-block h-2.5 w-2.5 shrink-0 rounded-sm border border-white/15"
                :style="{ backgroundColor: el.strokeColor }"
              />
              {{ el.strokeColor }}
            </span>

            <span class="py-0.5 text-foreground/40">background</span>
            <span class="flex items-center gap-1.5 py-0.5 font-mono text-foreground">
              <span
                class="inline-block h-2.5 w-2.5 shrink-0 rounded-sm border border-white/15"
                :style="{
                  backgroundColor:
                    el.backgroundColor === 'transparent' ? 'transparent' : el.backgroundColor,
                  borderStyle: el.backgroundColor === 'transparent' ? 'dashed' : 'solid',
                }"
              />
              {{ el.backgroundColor }}
            </span>

            <span class="py-0.5 text-foreground/40">fill</span>
            <span class="py-0.5 font-mono text-foreground">{{ el.fillStyle }}</span>

            <span class="py-0.5 text-foreground/40">strokeW</span>
            <span class="py-0.5 font-mono text-foreground">{{ el.strokeWidth }}</span>

            <span class="py-0.5 text-foreground/40">opacity</span>
            <span class="py-0.5 font-mono text-foreground">{{ el.opacity }}%</span>

            <span class="py-0.5 text-foreground/40">groups</span>
            <span
              class="py-0.5 font-mono"
              :class="el.groupIds?.length ? 'text-foreground' : 'text-foreground/30 italic'"
            >
              {{ el.groupIds?.length ? el.groupIds.join(", ") : "none" }}
            </span>

            <span class="py-0.5 text-foreground/40">bound</span>
            <span
              class="py-0.5 font-mono"
              :class="el.boundElements?.length ? 'text-foreground' : 'text-foreground/30 italic'"
            >
              {{
                el.boundElements?.length
                  ? el.boundElements.map((b) => `${b.id.slice(0, 6)}(${b.type})`).join(", ")
                  : "none"
              }}
            </span>
          </div>

          <!-- Minimap -->
          <div
            class="relative mt-1.5 h-12 overflow-hidden rounded border border-white/[0.04] bg-black/20"
          >
            <div
              v-for="pos in minimapPositions(el.id)"
              :key="pos.id"
              class="absolute rounded-sm"
              :class="
                pos.isCurrent
                  ? 'border-[1.5px] border-accent bg-accent/[0.08]'
                  : 'border border-white/[0.12] bg-white/[0.03]'
              "
              :style="{ left: pos.left, top: pos.top, width: pos.width, height: pos.height }"
            />
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div
        v-if="filteredElements.length === 0"
        class="px-3 py-6 text-center text-xs text-foreground/30"
      >
        No elements{{ filterType !== "all" ? ` of type "${filterType}"` : "" }}.
      </div>
    </div>
  </div>
</template>
