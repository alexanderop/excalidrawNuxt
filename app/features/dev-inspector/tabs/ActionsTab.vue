<script setup lang="ts">
import { computed, ref } from "vue";
import type { ActionDefinition, ActionRegistry } from "@drawvue/core";

const { registry } = defineProps<{
  registry: ActionRegistry;
}>();

const searchQuery = ref("");

// ── Recently used actions ──────────────────────────────────────────

const MAX_RECENT = 4;
const recentActionIds = ref<string[]>([]);

// We need to access the registry's internal map. Since ActionRegistry
// only exposes get/execute/isEnabled/register, we'll enumerate known IDs.
const ALL_ACTION_IDS = [
  // Tools
  "tool:selection",
  "tool:hand",
  "tool:rectangle",
  "tool:diamond",
  "tool:ellipse",
  "tool:arrow",
  "tool:text",
  "tool:freedraw",
  "tool:code",
  "tool:line",
  "tool:image",
  // Actions
  "action:delete",
  "action:duplicate",
  "action:select-all",
  "action:group",
  "action:ungroup",
  // Layers
  "layer:bring-to-front",
  "layer:bring-forward",
  "layer:send-backward",
  "layer:send-to-back",
  // Clipboard
  "clipboard:copy",
  "clipboard:cut",
  "clipboard:paste",
  // History
  "history:undo",
  "history:redo",
  // Settings
  "settings:toggle-theme",
  // Styles
  "style:copy-styles",
  "style:paste-styles",
] as const;

// ── Category color mapping ─────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  tool: "bg-accent/15 text-accent",
  action: "bg-blue-400/[0.12] text-blue-400",
  layer: "bg-green-400/[0.12] text-green-400",
  clipboard: "bg-amber-400/[0.12] text-amber-400",
  history: "bg-purple-400/[0.12] text-purple-400",
  settings: "bg-foreground/10 text-foreground/50",
  style: "bg-orange-400/[0.12] text-orange-400",
  flip: "bg-cyan-300/[0.12] text-cyan-300",
};

interface ActionGroup {
  label: string;
  prefix: string;
  actions: Array<{
    def: ActionDefinition;
    enabled: boolean;
  }>;
}

const groups = computed((): ActionGroup[] => {
  const groupMap = new Map<string, ActionGroup>();
  const order = ["tool", "action", "layer", "clipboard", "history", "settings", "style"];

  for (const prefix of order) {
    groupMap.set(prefix, {
      label: prefix.charAt(0).toUpperCase() + prefix.slice(1),
      prefix,
      actions: [],
    });
  }

  for (const id of ALL_ACTION_IDS) {
    const def = registry.get(id);
    if (!def) continue;

    const query = searchQuery.value.toLowerCase();
    if (
      query &&
      !def.label.toLowerCase().includes(query) &&
      !def.id.toLowerCase().includes(query)
    ) {
      continue;
    }

    const prefix = id.split(":")[0]!;
    const group = groupMap.get(prefix);
    if (group) {
      group.actions.push({ def, enabled: registry.isEnabled(id) });
    }
  }

  return order.map((prefix) => groupMap.get(prefix)!).filter((g) => g.actions.length > 0);
});

// ── Recently used actions (resolved) ───────────────────────────────

const recentActions = computed(() =>
  recentActionIds.value
    .map((id) => registry.get(id as Parameters<typeof registry.get>[0]))
    .filter((d): d is ActionDefinition => d != null),
);

function executeAction(id: string): void {
  registry.execute(id as Parameters<typeof registry.execute>[0]);

  // Track recently used
  const filtered = recentActionIds.value.filter((r) => r !== id);
  filtered.unshift(id);
  recentActionIds.value = filtered.slice(0, MAX_RECENT);
}
</script>

<template>
  <div class="flex flex-col gap-0">
    <!-- Search -->
    <div class="border-b border-edge/20 px-3 py-2">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search actions..."
        class="h-7 w-full rounded border border-edge/30 bg-surface/60 px-2 text-xs text-foreground/80 outline-none placeholder:text-foreground/30 focus:border-accent/50"
      />
    </div>

    <!-- Recently used pills -->
    <div
      v-if="recentActions.length > 0 && !searchQuery"
      class="border-b border-white/[0.04] px-2 py-1.5"
    >
      <div class="mb-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-foreground/30">
        Recently Used
      </div>
      <div class="flex flex-wrap gap-1">
        <button
          v-for="action in recentActions"
          :key="action.id"
          class="rounded-full border border-white/[0.04] bg-surface px-2 py-[3px] text-[10px] font-medium text-foreground/60 transition-all hover:border-accent hover:bg-accent/15 hover:text-accent"
          @click="executeAction(action.id)"
        >
          {{ action.label }}
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-1.5">
      <template v-for="group in groups" :key="group.prefix">
        <!-- Section divider with line -->
        <div class="flex items-center gap-1.5 px-2 pt-2.5 pb-1">
          <span class="text-[9px] font-semibold uppercase tracking-[0.08em] text-foreground/30">
            {{ group.label }}
          </span>
          <span class="h-px flex-1 bg-white/5" />
        </div>

        <div
          v-for="{ def, enabled } in group.actions"
          :key="def.id"
          class="group flex cursor-pointer items-center gap-2 rounded-md px-2 py-[5px] transition-all hover:bg-white/[0.04]"
          :class="{ 'opacity-40 cursor-default': !enabled }"
          :title="enabled ? `Execute: ${def.label}` : `${def.label} (disabled)`"
          @click="enabled && executeAction(def.id)"
        >
          <!-- Category-colored icon -->
          <div
            class="flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] font-mono text-[11px] font-semibold"
            :class="CATEGORY_COLORS[group.prefix] ?? 'bg-foreground/10 text-foreground/50'"
          >
            {{ def.label.charAt(0) }}
          </div>

          <!-- Label -->
          <span
            class="flex-1 text-xs font-medium"
            :class="enabled ? 'text-foreground' : 'text-foreground/40'"
          >
            {{ def.label }}
          </span>

          <!-- Keyboard shortcuts -->
          <span v-if="def.kbds?.length" class="flex gap-[3px]">
            <span
              v-for="(kbd, i) in def.kbds"
              :key="i"
              class="inline-block rounded border border-white/[0.06] bg-surface px-[5px] py-[2px] font-mono text-[10px] font-medium leading-tight text-foreground/40"
            >
              {{ kbd }}
            </span>
          </span>

          <!-- Status dot -->
          <span
            class="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
            :class="enabled ? 'bg-green-400' : 'bg-foreground/20 opacity-30'"
          />

          <!-- Play button (hover only) -->
          <button
            v-if="enabled"
            class="flex h-5 w-5 items-center justify-center rounded opacity-0 transition-all group-hover:opacity-100 hover:bg-accent/15 hover:text-accent"
            :class="enabled ? 'text-foreground/40' : 'pointer-events-none'"
            @click.stop="executeAction(def.id)"
          >
            <svg class="h-[10px] w-[10px]" viewBox="0 0 12 12" fill="currentColor">
              <path d="M2 1l9 5-9 5z" />
            </svg>
          </button>
        </div>
      </template>

      <!-- Empty state -->
      <div v-if="groups.length === 0" class="px-3 py-6 text-center text-xs text-foreground/30">
        No actions match "{{ searchQuery }}"
      </div>
    </div>
  </div>
</template>
