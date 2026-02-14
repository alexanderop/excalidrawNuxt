<script setup lang="ts">
import { computed } from "vue";
import type { ShallowRef } from "vue";
import type { HistoryEntry, ExcalidrawElement } from "@drawvue/core";

const { undoStack, redoStack, canUndo, canRedo, currentElementCount, currentSelectedCount } =
  defineProps<{
    undoStack: Readonly<ShallowRef<readonly HistoryEntry[]>>;
    redoStack: Readonly<ShallowRef<readonly HistoryEntry[]>>;
    canUndo: boolean;
    canRedo: boolean;
    currentElementCount: number;
    currentSelectedCount: number;
  }>();

const MAX_HISTORY = 100;

// ── Operation diff detection ───────────────────────────────────────

type OpType = "add" | "remove" | "move" | "resize" | "style" | "select";

interface DiffResult {
  op: OpType;
  label: string;
  meta: string;
}

function detectCountChange(
  beforeEls: readonly ExcalidrawElement[],
  afterEls: readonly ExcalidrawElement[],
): DiffResult | null {
  if (afterEls.length > beforeEls.length) {
    const diff = afterEls.length - beforeEls.length;
    const newEl = afterEls.at(-1);
    const typeName = newEl ? newEl.type : "element";
    return {
      op: "add",
      label: diff === 1 ? `Added ${typeName}` : `Added ${diff} elements`,
      meta: `${afterEls.length} elements`,
    };
  }

  if (afterEls.length < beforeEls.length) {
    const diff = beforeEls.length - afterEls.length;
    return {
      op: "remove",
      label: diff === 1 ? "Deleted element" : `Deleted ${diff} elements`,
      meta: `${afterEls.length} elements`,
    };
  }

  return null;
}

function isMoved(prev: ExcalidrawElement, el: ExcalidrawElement): boolean {
  return Math.round(prev.x) !== Math.round(el.x) || Math.round(prev.y) !== Math.round(el.y);
}

function isResized(prev: ExcalidrawElement, el: ExcalidrawElement): boolean {
  return (
    Math.round(prev.width) !== Math.round(el.width) ||
    Math.round(prev.height) !== Math.round(el.height)
  );
}

function isStyleChanged(prev: ExcalidrawElement, el: ExcalidrawElement): boolean {
  return (
    prev.strokeColor !== el.strokeColor ||
    prev.backgroundColor !== el.backgroundColor ||
    prev.fillStyle !== el.fillStyle
  );
}

function countLabel(count: number, singular: string): string {
  return count === 1 ? `${singular} element` : `${singular} ${count} elements`;
}

interface ChangeStats {
  movedCount: number;
  resizedCount: number;
  styleChanged: boolean;
  styleDiff: string;
}

function collectChanges(
  beforeEls: readonly ExcalidrawElement[],
  afterEls: readonly ExcalidrawElement[],
): ChangeStats {
  const beforeMap = new Map<string, ExcalidrawElement>();
  for (const el of beforeEls) beforeMap.set(el.id, el);

  const stats: ChangeStats = { movedCount: 0, resizedCount: 0, styleChanged: false, styleDiff: "" };
  for (const el of afterEls) {
    const prev = beforeMap.get(el.id);
    if (!prev) continue;
    if (isMoved(prev, el)) stats.movedCount++;
    if (isResized(prev, el)) stats.resizedCount++;
    if (isStyleChanged(prev, el)) {
      stats.styleChanged = true;
      if (prev.fillStyle !== el.fillStyle) stats.styleDiff = `-${prev.fillStyle} +${el.fillStyle}`;
    }
  }
  return stats;
}

function detectPropertyChange(
  beforeEls: readonly ExcalidrawElement[],
  afterEls: readonly ExcalidrawElement[],
): DiffResult {
  const { movedCount, resizedCount, styleChanged, styleDiff } = collectChanges(beforeEls, afterEls);
  const meta = `${afterEls.length} elements`;

  if (movedCount > 0) return { op: "move", label: countLabel(movedCount, "Moved"), meta };
  if (resizedCount > 0) return { op: "resize", label: countLabel(resizedCount, "Resized"), meta };
  if (styleChanged) return { op: "style", label: "Changed style", meta: styleDiff || meta };
  return { op: "select", label: "Selection changed", meta };
}

function detectDiff(before: HistoryEntry, after: HistoryEntry): DiffResult {
  const beforeEls = before.elements.filter((e) => !e.isDeleted);
  const afterEls = after.elements.filter((e) => !e.isDeleted);

  return detectCountChange(beforeEls, afterEls) ?? detectPropertyChange(beforeEls, afterEls);
}

// ── Operation icon/color mapping ───────────────────────────────────

const OP_CONFIG: Record<OpType, { icon: string; classes: string }> = {
  add: { icon: "+", classes: "bg-green-400/15 text-green-400" },
  remove: { icon: "-", classes: "bg-red-400/15 text-red-400" },
  move: { icon: "M", classes: "bg-blue-400/15 text-blue-400" },
  resize: { icon: "R", classes: "bg-cyan-300/15 text-cyan-300" },
  style: { icon: "S", classes: "bg-amber-400/15 text-amber-400" },
  select: { icon: ".", classes: "bg-foreground/10 text-foreground/50" },
};

// ── Computed entries with diffs ─────────────────────────────────────

interface DisplayEntry {
  index: number;
  summary: string;
  elementCount: number;
  diff: DiffResult | null;
}

const undoEntries = computed((): DisplayEntry[] => {
  const stack = undoStack.value;
  return [...stack].toReversed().map((entry, i) => {
    const actualIdx = stack.length - 1 - i;
    const prevEntry = actualIdx > 0 ? stack[actualIdx - 1] : null;
    return {
      index: stack.length - i,
      summary: summarizeEntry(entry),
      elementCount: entry.elements.filter((e) => !e.isDeleted).length,
      diff: prevEntry
        ? detectDiff(prevEntry, entry)
        : {
            op: "add" as const,
            label: "Initial state",
            meta: `${entry.elements.filter((e) => !e.isDeleted).length} elements`,
          },
    };
  });
});

const redoEntries = computed((): DisplayEntry[] =>
  redoStack.value.map((entry, i) => ({
    index: i + 1,
    summary: summarizeEntry(entry),
    elementCount: entry.elements.filter((e) => !e.isDeleted).length,
    diff: i > 0 ? detectDiff(redoStack.value[i - 1]!, entry) : null,
  })),
);

function summarizeEntry(entry: HistoryEntry): string {
  const elCount = entry.elements.filter((e) => !e.isDeleted).length;
  const selCount = entry.selectedIds.size;
  const parts: string[] = [`${elCount} el`];
  if (selCount > 0) parts.push(`${selCount} sel`);
  return parts.join(", ");
}
</script>

<template>
  <div class="flex flex-col gap-0">
    <!-- Summary bar with undo/redo counters and nav buttons -->
    <div class="flex items-center gap-3 border-b border-white/[0.04] px-2 py-2">
      <div class="flex items-center gap-1.5 text-[11px] text-foreground/60">
        Undo:
        <span class="font-mono text-[13px] font-semibold text-foreground">{{
          undoStack.value.length
        }}</span>
        <span class="text-[10px] text-foreground/30">/{{ MAX_HISTORY }}</span>
      </div>
      <div class="flex items-center gap-1.5 text-[11px] text-foreground/60">
        Redo:
        <span class="font-mono text-[13px] font-semibold text-foreground">{{
          redoStack.value.length
        }}</span>
      </div>
      <div class="ml-auto flex gap-1">
        <button
          class="flex h-6 w-6 items-center justify-center rounded border border-white/[0.08] bg-surface text-foreground/60 transition-all hover:border-accent hover:bg-accent/15 hover:text-accent"
          :class="{ 'pointer-events-none opacity-30': !canUndo }"
          title="Undo"
        >
          <svg
            class="h-3 w-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M3 10h13a4 4 0 010 8H7" />
            <path d="M7 6l-4 4 4 4" />
          </svg>
        </button>
        <button
          class="flex h-6 w-6 items-center justify-center rounded border border-white/[0.08] bg-surface text-foreground/60 transition-all hover:border-accent hover:bg-accent/15 hover:text-accent"
          :class="{ 'pointer-events-none opacity-30': !canRedo }"
          title="Redo"
        >
          <svg
            class="h-3 w-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M21 10H8a4 4 0 000 8h9" />
            <path d="M17 6l4 4-4 4" />
          </svg>
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto">
      <!-- Redo stack (future states, dimmed) -->
      <template v-if="redoEntries.length > 0">
        <div
          class="px-2 pt-2.5 pb-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-foreground/30"
        >
          Redo Stack
        </div>
        <!-- Timeline container -->
        <div class="relative pl-6">
          <!-- Vertical timeline line -->
          <div class="absolute top-1 bottom-1 left-[11px] w-px bg-white/[0.06]" />
          <div
            v-for="entry in redoEntries"
            :key="`redo-${entry.index}`"
            class="relative mb-px cursor-pointer rounded-md px-2 py-1.5 opacity-50 transition-all hover:bg-white/[0.03]"
          >
            <!-- Timeline dot -->
            <div
              class="absolute -left-[17px] top-3.5 z-[1] h-[7px] w-[7px] rounded-full border-[1.5px] border-foreground/30 bg-surface"
            />
            <div class="flex items-center justify-between gap-2">
              <span class="flex items-center gap-1.5 text-xs font-medium text-foreground/70">
                <span
                  v-if="entry.diff"
                  class="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded text-[10px]"
                  :class="OP_CONFIG[entry.diff.op].classes"
                >
                  {{ OP_CONFIG[entry.diff.op].icon }}
                </span>
                {{ entry.diff?.label ?? entry.summary }}
              </span>
            </div>
            <div
              v-if="entry.diff?.meta"
              class="mt-0.5 pl-6 font-mono text-[10px] text-foreground/30"
            >
              {{ entry.diff.meta }}
            </div>
          </div>
        </div>
      </template>

      <!-- Current state (highlighted) -->
      <div
        class="px-2 pt-2.5 pb-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-accent"
      >
        Current State
      </div>
      <div class="relative pl-6">
        <div class="absolute top-1 bottom-1 left-[11px] w-px bg-white/[0.06]" />
        <div class="relative mb-px rounded-md border border-accent/20 bg-accent/15 px-2 py-1.5">
          <!-- Glowing accent dot -->
          <div
            class="absolute -left-[17px] top-3.5 z-[1] h-[7px] w-[7px] rounded-full border-[1.5px] border-accent bg-accent shadow-[0_0_8px_rgba(255,107,237,0.5)]"
          />
          <div class="flex items-center justify-between gap-2">
            <span class="flex items-center gap-1.5 text-xs font-medium text-accent">
              <span
                class="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded bg-accent/20 text-[10px] text-accent"
              >
                ●
              </span>
              Current
            </span>
          </div>
          <div class="mt-0.5 pl-6 font-mono text-[10px] text-foreground/50">
            {{ currentElementCount }} el, {{ currentSelectedCount }} sel
          </div>
        </div>
      </div>

      <!-- Undo stack (past states) -->
      <template v-if="undoEntries.length > 0">
        <div
          class="px-2 pt-2.5 pb-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-foreground/30"
        >
          Undo Stack
        </div>
        <div class="relative pl-6">
          <div class="absolute top-1 bottom-1 left-[11px] w-px bg-white/[0.06]" />
          <div
            v-for="entry in undoEntries"
            :key="`undo-${entry.index}`"
            class="relative mb-px cursor-pointer rounded-md px-2 py-1.5 opacity-70 transition-all hover:bg-white/[0.03]"
          >
            <!-- Timeline dot -->
            <div
              class="absolute -left-[17px] top-3.5 z-[1] h-[7px] w-[7px] rounded-full border-[1.5px] border-foreground/30 bg-surface"
            />
            <div class="flex items-center justify-between gap-2">
              <span class="flex items-center gap-1.5 text-xs font-medium text-foreground/80">
                <span
                  v-if="entry.diff"
                  class="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded text-[10px]"
                  :class="OP_CONFIG[entry.diff.op].classes"
                >
                  {{ OP_CONFIG[entry.diff.op].icon }}
                </span>
                {{ entry.diff?.label ?? entry.summary }}
              </span>
            </div>
            <div
              v-if="entry.diff?.meta"
              class="mt-0.5 pl-6 font-mono text-[10px] text-foreground/40"
            >
              {{ entry.diff.meta }}
            </div>
          </div>
        </div>
      </template>

      <!-- Empty state -->
      <div
        v-if="undoEntries.length === 0 && redoEntries.length === 0"
        class="px-3 py-6 text-center text-xs text-foreground/30"
      >
        No history yet. Draw something!
      </div>
    </div>
  </div>
</template>
