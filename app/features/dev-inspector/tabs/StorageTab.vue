<script setup lang="ts">
import { computed, inject, onMounted, ref, watch } from "vue";
import { useTimeAgo } from "@vueuse/core";
import { useDrawVue, getNonDeletedElements, tryCatch } from "@drawvue/core";
import { PERSISTENCE_INSPECTOR_KEY } from "~/features/persistence/types";
import type { PersistenceEvent, StoreMetadata } from "~/features/persistence/types";
import { getScene } from "~/features/persistence/stores";

const ctx = useDrawVue();
const persistence = inject(PERSISTENCE_INSPECTOR_KEY);

// ── Fallback when not provided ────────────────────────────────────────
const hasPersistence = computed(() => persistence !== undefined);

// ── Collapsible sections ──────────────────────────────────────────────
const openSections = ref(new Set(["version", "stores", "quota"]));

function toggleSection(id: string): void {
  if (openSections.value.has(id)) {
    openSections.value.delete(id);
    return;
  }
  openSections.value.add(id);
}

// ── IDB store metadata ────────────────────────────────────────────────
const storeMetadata = ref<StoreMetadata>({ current: null, backup: null, emergency: null });

async function refreshMetadata(): Promise<void> {
  if (!persistence) return;
  storeMetadata.value = await persistence.diagnostics.readStoreMetadata();
}

// ── Storage quota ─────────────────────────────────────────────────────
const quotaUsed = ref<number | null>(null);
const quotaAvailable = ref<number | null>(null);
const quotaPersisted = ref<boolean | null>(null);

async function refreshQuota(): Promise<void> {
  if (!navigator.storage?.estimate) return;
  const [estimateErr, estimate] = await tryCatch(navigator.storage.estimate());
  if (!estimateErr && estimate) {
    quotaUsed.value = estimate.usage ?? null;
    quotaAvailable.value = estimate.quota ?? null;
  }
  if (navigator.storage?.persisted) {
    const [persistErr, persisted] = await tryCatch(navigator.storage.persisted());
    if (!persistErr) {
      quotaPersisted.value = persisted;
    }
  }
}

// ── Last saved timestamp ──────────────────────────────────────────────
const lastSavedAt = ref(Date.now());
const lastSavedAgo = useTimeAgo(lastSavedAt);

// ── Derived data ──────────────────────────────────────────────────────
const saveStatus = computed(() => persistence?.saveStatus.value ?? "unavailable");
const isRestored = computed(() => persistence?.isRestored.value ?? false);
const sceneHash = computed(() => persistence?.diagnostics.sceneHash.value ?? 0);
const lastSavedHash = computed(() => persistence?.diagnostics.lastSavedHash.value ?? 0);
const forwardVersionMode = computed(
  () => persistence?.diagnostics.forwardVersionMode.value ?? false,
);
const events = computed(() => persistence?.diagnostics.events.value ?? []);
const inMemoryCount = computed(() => getNonDeletedElements(ctx.elements.elements.value).length);
const hashSynced = computed(() => sceneHash.value === lastSavedHash.value);

// ── Event flash tracking ──────────────────────────────────────────────
const flashedEventId = ref<number | null>(null);

// ── Refresh on mount + after save events ──────────────────────────────
onMounted(() => {
  void refreshMetadata();
  void refreshQuota();
});

watch(events, (newEvents, oldEvents) => {
  if (newEvents.length === 0) return;
  const latest = newEvents.at(-1)!;

  // Flash the latest event
  flashedEventId.value = latest.id;
  setTimeout(() => {
    flashedEventId.value = null;
  }, 600);

  // Refresh metadata after save/clear events
  if (latest.type === "save" || latest.type === "clear") {
    lastSavedAt.value = latest.timestamp;
    void refreshMetadata();
    void refreshQuota();
  }

  // Suppress unused-var warning for oldEvents
  void oldEvents;
});

// ── Section icons ─────────────────────────────────────────────────────
const SECTION_ICONS = {
  version: {
    svg: "M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zM9 12l2 2 4-4",
    classes: "bg-green-400/[0.12] text-green-400",
  },
  stores: {
    svg: "M12 2C6.48 2 3 3.34 3 5v14c0 1.66 3.48 3 9 3s9-1.34 9-3V5c0-1.66-3.48-3-9-3z",
    classes: "bg-purple-400/[0.12] text-purple-400",
  },
  quota: {
    svg: "M2 6h20v12H2zM6 12h.01M10 12h.01",
    classes: "bg-cyan-400/[0.12] text-cyan-400",
  },
};

// ── Status config ─────────────────────────────────────────────────────
const STATUS_CONFIG = {
  idle: {
    label: "All Changes Saved",
    color: "text-green-400",
    ring: "border-green-400",
    dot: "bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]",
  },
  pending: {
    label: "Pending...",
    color: "text-amber-400",
    ring: "border-amber-400",
    dot: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]",
  },
  saving: {
    label: "Saving...",
    color: "text-blue-400",
    ring: "border-blue-400",
    dot: "bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]",
  },
  error: {
    label: "Save Error",
    color: "text-red-400",
    ring: "border-red-400",
    dot: "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]",
  },
  unavailable: {
    label: "Unavailable",
    color: "text-foreground/30",
    ring: "border-foreground/15",
    dot: "bg-foreground/20",
  },
} as const;

const statusConfig = computed(() => STATUS_CONFIG[saveStatus.value]);

// ── Event dot colors ──────────────────────────────────────────────────
function eventDotColor(type: PersistenceEvent["type"]): string {
  const map: Record<string, string> = {
    save: "bg-green-400",
    "save-skip": "bg-green-400",
    backup: "bg-purple-400",
    debounce: "bg-amber-400",
    change: "bg-foreground/20",
    restore: "bg-blue-400",
    probe: "bg-cyan-400",
    error: "bg-red-400",
    clear: "bg-red-400",
    export: "bg-accent",
  };
  return map[type] ?? "bg-foreground/20";
}

// ── Format helpers ────────────────────────────────────────────────────
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatEventTime(timestamp: number): string {
  const seconds = Math.round((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  return `${minutes}m`;
}

function quotaPercent(): number {
  if (quotaUsed.value === null || quotaAvailable.value === null || quotaAvailable.value === 0)
    return 0;
  return (quotaUsed.value / quotaAvailable.value) * 100;
}

// ── Actions ───────────────────────────────────────────────────────────
function handleForceSave(): void {
  if (!persistence) return;
  persistence.diagnostics.flushSave();
}

async function handleExport(): Promise<void> {
  const [err, data] = await getScene("scene:current");
  if (err || data === undefined) return;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `drawvue-scene-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function handleClear(): Promise<void> {
  if (!persistence) return;
  if (!confirm("Clear all persisted data? Your current drawing stays in memory.")) return;
  await persistence.diagnostics.clearStorage();
  await refreshMetadata();
}

const forceSaveDisabled = computed(
  () => forwardVersionMode.value || saveStatus.value === "unavailable" || !isRestored.value,
);
const exportDisabled = computed(() => storeMetadata.value.current === null);
</script>

<template>
  <div v-if="!hasPersistence" class="p-4 text-center text-[11px] text-foreground/30 italic">
    PersistenceProvider not found
  </div>

  <div v-else class="flex h-full flex-col">
    <!-- ── Save Status Hero ──────────────────────────────────────── -->
    <div
      class="border-b border-white/[0.04] bg-gradient-to-b from-[rgb(24,28,40)]/60 to-transparent px-3 py-3"
    >
      <div class="flex items-center gap-2.5">
        <!-- Status ring -->
        <div class="relative flex h-9 w-9 shrink-0 items-center justify-center">
          <div
            class="absolute inset-0 rounded-full border-2"
            :class="[
              statusConfig.ring,
              saveStatus === 'pending' && 'animate-spin border-t-transparent',
              saveStatus === 'saving' && 'animate-spin border-t-transparent border-r-transparent',
              saveStatus === 'error' && 'animate-pulse',
              (saveStatus === 'idle' || saveStatus === 'unavailable') && 'opacity-40',
            ]"
          />
          <div class="h-2.5 w-2.5 rounded-full" :class="statusConfig.dot" />
        </div>

        <!-- Status info -->
        <div class="min-w-0 flex-1">
          <div class="font-mono text-xs font-semibold" :class="statusConfig.color">
            {{ statusConfig.label }}
          </div>
          <div class="font-mono text-[10px] text-foreground/35">
            Last save {{ lastSavedAgo }} · scene:current
          </div>
        </div>

        <!-- Hash pill -->
        <div
          class="flex items-center gap-1 rounded-md border border-white/[0.06] bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] font-medium"
          :class="hashSynced ? 'text-green-400' : 'text-amber-400'"
        >
          <span
            class="inline-block h-[5px] w-[5px] rounded-full"
            :class="hashSynced ? 'bg-green-400' : 'bg-amber-400'"
          />
          {{ sceneHash }}
        </div>
      </div>

      <!-- State machine strip -->
      <div class="mt-2.5 flex items-center gap-0 overflow-x-auto">
        <div
          v-for="state in ['idle', 'pending', 'saving', 'error'] as const"
          :key="state"
          class="flex items-center"
        >
          <div
            class="rounded border px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide whitespace-nowrap"
            :class="[
              saveStatus === state
                ? {
                    idle: 'border-green-400 bg-green-400/[0.12] text-green-400 shadow-[0_0_12px_rgba(74,222,128,0.15)]',
                    pending:
                      'border-amber-400 bg-amber-400/[0.12] text-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.15)]',
                    saving:
                      'border-blue-400 bg-blue-400/[0.12] text-blue-400 shadow-[0_0_12px_rgba(96,165,250,0.15)]',
                    error:
                      'border-red-400 bg-red-400/[0.12] text-red-400 shadow-[0_0_12px_rgba(248,113,113,0.15)]',
                  }[state]
                : {
                    idle: 'border-green-400/25 bg-green-400/5 text-green-400/50',
                    pending: 'border-amber-400/25 bg-amber-400/5 text-amber-400/50',
                    saving: 'border-blue-400/25 bg-blue-400/5 text-blue-400/50',
                    error: 'border-red-400/25 bg-red-400/5 text-red-400/50',
                  }[state],
            ]"
          >
            {{ state }}
          </div>
          <div
            v-if="state !== 'error'"
            class="h-px w-4 shrink-0"
            :class="saveStatus === state ? 'bg-white/25' : 'bg-white/10'"
          />
        </div>
      </div>
    </div>

    <!-- ── Scrollable content ──────────────────────────────────────── -->
    <div class="flex flex-1 flex-col gap-0.5 overflow-y-auto p-1.5">
      <!-- ── Version & Hash Section ────────────────────────────── -->
      <div class="overflow-hidden rounded-md">
        <div
          class="flex cursor-pointer select-none items-center gap-[7px] px-2 py-[7px] transition-colors hover:bg-white/[0.03]"
          @click="toggleSection('version')"
        >
          <div
            class="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[5px]"
            :class="SECTION_ICONS.version.classes"
          >
            <svg
              class="h-3 w-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path :d="SECTION_ICONS.version.svg" />
            </svg>
          </div>
          <span class="flex-1 text-[11px] font-semibold uppercase tracking-wide text-foreground/60"
            >Version & Hash</span
          >
          <svg
            class="h-3.5 w-3.5 text-foreground/30 transition-transform duration-200"
            :class="{ 'rotate-90': openSections.has('version') }"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>
        <div v-if="openSections.has('version')" class="space-y-0 px-2 pb-2 pl-9">
          <div class="flex items-center justify-between border-b border-white/[0.02] py-[3px]">
            <span class="text-[11px] text-foreground/40">sceneHash</span>
            <span
              class="rounded px-1 py-px font-mono text-[11px] font-medium"
              :class="hashSynced ? 'text-green-400' : 'text-amber-400'"
            >
              {{ sceneHash }}
            </span>
          </div>
          <div class="flex items-center justify-between border-b border-white/[0.02] py-[3px]">
            <span class="text-[11px] text-foreground/40">lastSavedHash</span>
            <span class="rounded px-1 py-px font-mono text-[11px] font-medium text-foreground">
              {{ lastSavedHash }}
            </span>
          </div>
          <div class="flex items-center justify-between border-b border-white/[0.02] py-[3px]">
            <span class="text-[11px] text-foreground/40">in-memory</span>
            <span class="rounded px-1 py-px font-mono text-[11px] font-medium text-foreground">
              {{ inMemoryCount }} elements
            </span>
          </div>
          <div class="flex items-center justify-between border-b border-white/[0.02] py-[3px]">
            <span class="text-[11px] text-foreground/40">persisted</span>
            <span class="rounded px-1 py-px font-mono text-[11px] font-medium text-foreground">
              {{ storeMetadata.current?.elementCount ?? "—" }} elements
            </span>
          </div>
          <div class="flex items-center justify-between border-b border-white/[0.02] py-[3px]">
            <span class="text-[11px] text-foreground/40">schemaVersion</span>
            <span class="rounded px-1 py-px font-mono text-[11px] font-medium text-foreground/60">
              {{ storeMetadata.current?.schemaVersion ?? 1 }}
            </span>
          </div>
          <div class="flex items-center justify-between py-[3px]">
            <span class="text-[11px] text-foreground/40">forwardMode</span>
            <span
              class="rounded px-1 py-px font-mono text-[11px]"
              :class="
                forwardVersionMode ? 'font-medium text-amber-400' : 'italic text-foreground/30'
              "
            >
              {{ forwardVersionMode }}
            </span>
          </div>
        </div>
      </div>

      <!-- ── IndexedDB Stores Section ──────────────────────────── -->
      <div class="overflow-hidden rounded-md">
        <div
          class="flex cursor-pointer select-none items-center gap-[7px] px-2 py-[7px] transition-colors hover:bg-white/[0.03]"
          @click="toggleSection('stores')"
        >
          <div
            class="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[5px]"
            :class="SECTION_ICONS.stores.classes"
          >
            <svg
              class="h-3 w-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path :d="SECTION_ICONS.stores.svg" />
            </svg>
          </div>
          <span class="flex-1 text-[11px] font-semibold uppercase tracking-wide text-foreground/60"
            >IndexedDB Stores</span
          >
          <svg
            class="h-3.5 w-3.5 text-foreground/30 transition-transform duration-200"
            :class="{ 'rotate-90': openSections.has('stores') }"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>
        <div v-if="openSections.has('stores')" class="space-y-1.5 px-2 pb-2 pl-9">
          <!-- scene:current card -->
          <div class="overflow-hidden rounded-md border border-white/[0.06] bg-white/[0.02]">
            <div class="flex items-center justify-between border-b border-white/[0.04] px-2 py-1.5">
              <span
                class="flex items-center gap-1.5 font-mono text-[10px] font-semibold text-green-400"
              >
                <span class="inline-block h-2 w-2 rounded-full bg-green-400/30" />
                scene:current
              </span>
              <span
                class="rounded bg-green-400/[0.12] px-1.5 py-px font-mono text-[9px] font-semibold uppercase text-green-400"
              >
                active
              </span>
            </div>
            <div v-if="storeMetadata.current" class="px-2 py-1.5">
              <div class="flex items-center justify-between py-0.5">
                <span class="font-mono text-[10px] text-foreground/35">schemaVersion</span>
                <span class="font-mono text-[10px] font-medium text-foreground">{{
                  storeMetadata.current.schemaVersion
                }}</span>
              </div>
              <div class="flex items-center justify-between py-0.5">
                <span class="font-mono text-[10px] text-foreground/35">elementCount</span>
                <span class="font-mono text-[10px] font-medium text-foreground">{{
                  storeMetadata.current.elementCount
                }}</span>
              </div>
              <div class="flex items-center justify-between py-0.5">
                <span class="font-mono text-[10px] text-foreground/35">savedAt</span>
                <span class="font-mono text-[10px] font-medium text-foreground/60">{{
                  formatTime(storeMetadata.current.savedAt)
                }}</span>
              </div>
              <div class="flex items-center justify-between py-0.5">
                <span class="font-mono text-[10px] text-foreground/35">dataSize</span>
                <span class="font-mono text-[10px] font-medium text-foreground/40"
                  >~{{ formatBytes(storeMetadata.current.dataSize) }}</span
                >
              </div>
            </div>
            <div
              v-else
              class="px-2 py-2 text-center font-mono text-[10px] italic text-foreground/25"
            >
              No data
            </div>
          </div>

          <!-- scene:backup card -->
          <div class="overflow-hidden rounded-md border border-white/[0.06] bg-white/[0.02]">
            <div class="flex items-center justify-between border-b border-white/[0.04] px-2 py-1.5">
              <span
                class="flex items-center gap-1.5 font-mono text-[10px] font-semibold text-amber-400"
              >
                <span class="inline-block h-2 w-2 rounded-full bg-amber-400/20" />
                scene:backup
              </span>
              <span
                class="rounded bg-amber-400/[0.12] px-1.5 py-px font-mono text-[9px] font-semibold uppercase text-amber-400"
              >
                rolling
              </span>
            </div>
            <div v-if="storeMetadata.backup" class="px-2 py-1.5">
              <div class="flex items-center justify-between py-0.5">
                <span class="font-mono text-[10px] text-foreground/35">schemaVersion</span>
                <span class="font-mono text-[10px] font-medium text-foreground">{{
                  storeMetadata.backup.schemaVersion
                }}</span>
              </div>
              <div class="flex items-center justify-between py-0.5">
                <span class="font-mono text-[10px] text-foreground/35">elementCount</span>
                <span class="font-mono text-[10px] font-medium text-foreground">{{
                  storeMetadata.backup.elementCount
                }}</span>
              </div>
              <div class="flex items-center justify-between py-0.5">
                <span class="font-mono text-[10px] text-foreground/35">savedAt</span>
                <span class="font-mono text-[10px] font-medium text-foreground/60">{{
                  formatTime(storeMetadata.backup.savedAt)
                }}</span>
              </div>
              <div class="flex items-center justify-between py-0.5">
                <span class="font-mono text-[10px] text-foreground/35">delta</span>
                <span class="font-mono text-[10px] font-medium text-foreground/40">
                  {{ storeMetadata.backup.deltaVsCurrent >= 0 ? "+" : ""
                  }}{{ storeMetadata.backup.deltaVsCurrent }} el vs current
                </span>
              </div>
            </div>
            <div
              v-else
              class="px-2 py-2 text-center font-mono text-[10px] italic text-foreground/25"
            >
              No backup
            </div>
          </div>

          <!-- Emergency localStorage card -->
          <div
            v-if="storeMetadata.emergency"
            class="rounded-md border border-dashed border-amber-400/25 bg-amber-400/[0.04] px-2.5 py-2"
          >
            <div class="mb-1 flex items-center gap-1.5">
              <svg
                class="h-[11px] w-[11px] text-amber-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <path
                  d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span class="font-mono text-[10px] font-semibold text-amber-400"
                >localStorage emergency</span
              >
            </div>
            <div class="flex items-center justify-between py-0.5">
              <span class="font-mono text-[10px] text-foreground/35">timestamp</span>
              <span class="font-mono text-[10px] font-medium text-foreground/60">{{
                formatTime(storeMetadata.emergency.timestamp)
              }}</span>
            </div>
            <div class="flex items-center justify-between py-0.5">
              <span class="font-mono text-[10px] text-foreground/35">elements</span>
              <span class="font-mono text-[10px] font-medium text-foreground/40"
                >{{ storeMetadata.emergency.elementCount }} elements · ~{{
                  formatBytes(storeMetadata.emergency.dataSize)
                }}</span
              >
            </div>
          </div>
          <div
            v-else
            class="rounded-md border border-dashed border-white/[0.08] bg-white/[0.02] px-2.5 py-2 text-center font-mono text-[10px] italic text-foreground/25"
          >
            No emergency backup
          </div>
        </div>
      </div>

      <!-- ── Storage Quota Section ─────────────────────────────── -->
      <div class="overflow-hidden rounded-md">
        <div
          class="flex cursor-pointer select-none items-center gap-[7px] px-2 py-[7px] transition-colors hover:bg-white/[0.03]"
          @click="toggleSection('quota')"
        >
          <div
            class="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[5px]"
            :class="SECTION_ICONS.quota.classes"
          >
            <svg
              class="h-3 w-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path :d="SECTION_ICONS.quota.svg" />
            </svg>
          </div>
          <span class="flex-1 text-[11px] font-semibold uppercase tracking-wide text-foreground/60"
            >Storage Quota</span
          >
          <svg
            class="h-3.5 w-3.5 text-foreground/30 transition-transform duration-200"
            :class="{ 'rotate-90': openSections.has('quota') }"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>
        <div v-if="openSections.has('quota')" class="space-y-0 px-2 pb-2 pl-9">
          <template v-if="quotaAvailable !== null">
            <!-- Meter bar -->
            <div class="my-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                class="h-full rounded-full bg-gradient-to-r from-green-400 to-cyan-400 transition-[width] duration-400"
                :style="{ width: `${Math.max(quotaPercent(), 0.5)}%` }"
              />
            </div>
            <div class="mb-1.5 flex justify-between">
              <span class="font-mono text-[9px] text-foreground/35"
                >{{ quotaUsed !== null ? formatBytes(quotaUsed) : "?" }} used</span
              >
              <span class="font-mono text-[9px] text-foreground/25"
                >{{ formatBytes(quotaAvailable) }} available</span
              >
            </div>
          </template>
          <div v-else class="py-1.5 text-center font-mono text-[10px] italic text-foreground/25">
            Not available
          </div>
          <div class="flex items-center justify-between border-b border-white/[0.02] py-[3px]">
            <span class="text-[11px] text-foreground/40">persisted</span>
            <span
              class="flex items-center gap-1 rounded px-1 py-px font-mono text-[11px] font-medium"
              :class="
                quotaPersisted === true
                  ? 'text-green-400'
                  : quotaPersisted === false
                    ? 'text-foreground/40'
                    : 'italic text-foreground/25'
              "
            >
              <template v-if="quotaPersisted === true">&#10003; granted</template>
              <template v-else-if="quotaPersisted === false">not granted</template>
              <template v-else>N/A</template>
            </span>
          </div>
          <div class="flex items-center justify-between py-[3px]">
            <span class="text-[11px] text-foreground/40">IDB available</span>
            <span
              class="flex items-center gap-1 rounded px-1 py-px font-mono text-[11px] font-medium"
              :class="saveStatus !== 'unavailable' ? 'text-green-400' : 'text-red-400'"
            >
              <svg
                v-if="saveStatus !== 'unavailable'"
                class="h-2.5 w-2.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
              {{ saveStatus !== "unavailable" ? "yes" : "no" }}
            </span>
          </div>
        </div>
      </div>

      <!-- ── Event Log ───────────────────────────────────────────── -->
      <div class="max-h-[180px] overflow-y-auto border-t border-white/[0.04]">
        <div
          class="sticky top-0 z-[1] flex items-center justify-between bg-base/95 px-3 py-1.5 backdrop-blur-sm"
        >
          <span class="text-[9px] font-semibold uppercase tracking-widest text-foreground/30"
            >Persistence Log</span
          >
          <span class="font-mono text-[9px] text-foreground/20">{{ events.length }} events</span>
        </div>
        <div
          v-for="event in [...events].reverse()"
          :key="event.id"
          class="flex items-start gap-2 px-3 py-1 transition-colors hover:bg-white/[0.02]"
          :class="{ 'animate-event-flash': flashedEventId === event.id }"
        >
          <span
            class="min-w-[36px] pt-px font-mono text-[9px] text-foreground/25 whitespace-nowrap"
            >{{ formatEventTime(event.timestamp) }}</span
          >
          <span
            class="mt-1 h-[5px] w-[5px] shrink-0 rounded-full"
            :class="eventDotColor(event.type)"
          />
          <span class="font-mono text-[10px] leading-[1.4] text-foreground/55">
            <strong class="font-semibold text-foreground/75">{{
              event.type === "save-skip"
                ? "Save"
                : event.type.charAt(0).toUpperCase() + event.type.slice(1)
            }}</strong>
            {{ event.message }}
          </span>
        </div>
        <div
          v-if="events.length === 0"
          class="py-4 text-center font-mono text-[10px] italic text-foreground/20"
        >
          No events yet
        </div>
      </div>
    </div>

    <!-- ── Action Buttons ────────────────────────────────────────── -->
    <div class="flex shrink-0 gap-1 border-t border-white/[0.04] px-3 py-2">
      <button
        class="flex flex-1 items-center justify-center gap-1.5 rounded-[5px] border border-white/[0.08] bg-surface px-0 py-1.5 text-[10px] font-semibold text-foreground/60 transition-all hover:border-accent hover:bg-accent/15 hover:text-accent disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-white/[0.08] disabled:hover:bg-surface disabled:hover:text-foreground/60"
        :disabled="forceSaveDisabled"
        @click="handleForceSave"
      >
        <svg
          class="h-2.5 w-2.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <path
            d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2zM17 21v-8H7v8M7 3v5h8"
          />
        </svg>
        Force Save
      </button>
      <button
        class="flex flex-1 items-center justify-center gap-1.5 rounded-[5px] border border-white/[0.08] bg-surface px-0 py-1.5 text-[10px] font-semibold text-foreground/60 transition-all hover:border-accent hover:bg-accent/15 hover:text-accent disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-white/[0.08] disabled:hover:bg-surface disabled:hover:text-foreground/60"
        :disabled="exportDisabled"
        @click="handleExport"
      >
        <svg
          class="h-2.5 w-2.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
        </svg>
        Export
      </button>
      <button
        class="flex flex-1 items-center justify-center gap-1.5 rounded-[5px] border border-white/[0.08] bg-surface px-0 py-1.5 text-[10px] font-semibold text-foreground/60 transition-all hover:border-red-400 hover:bg-red-400/15 hover:text-red-400"
        @click="handleClear"
      >
        <svg
          class="h-2.5 w-2.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <path
            d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"
          />
        </svg>
        Clear
      </button>
    </div>
  </div>
</template>

<style scoped>
@keyframes event-flash {
  0% {
    background: rgb(255 107 237 / 0.08);
  }
  100% {
    background: transparent;
  }
}

.animate-event-flash {
  animation: event-flash 0.6s ease-out;
}
</style>
