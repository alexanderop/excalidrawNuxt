import { shallowRef, computed, triggerRef } from "vue";
import type { ShallowRef, ComputedRef } from "vue";
import type { ExcalidrawElement } from "../elements/types";
import type { DirtyFlags } from "../canvas/composables/createDirtyFlags";

const MAX_HISTORY = 100;

interface UseHistoryDeps {
  elements: ShallowRef<readonly ExcalidrawElement[]>;
  replaceElements: (els: readonly ExcalidrawElement[]) => void;
  selectedIds: ShallowRef<ReadonlySet<string>>;
  replaceSelection: (ids: Set<string>) => void;
  dirty: DirtyFlags;
}

export interface HistoryEntry {
  readonly elements: readonly ExcalidrawElement[];
  readonly selectedIds: ReadonlySet<string>;
}

export interface UseHistoryReturn {
  recordAction: (fn: () => void) => void;
  saveCheckpoint: () => void;
  commitCheckpoint: () => void;
  discardCheckpoint: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: ComputedRef<boolean>;
  canRedo: ComputedRef<boolean>;
  undoStack: Readonly<ShallowRef<readonly HistoryEntry[]>>;
  redoStack: Readonly<ShallowRef<readonly HistoryEntry[]>>;
}

/**
 * Snapshot current state for history storage.
 * Uses structuredClone to deep-copy elements — assumes ExcalidrawElement is
 * JSON-serializable (per upstream docs). Note: `customData?: Record<string, any>`
 * could contain non-cloneable values (functions, DOM nodes); if that becomes an
 * issue, switch to a JSON round-trip or custom serializer.
 */
function captureSnapshot(
  elements: readonly ExcalidrawElement[],
  selectedIds: ReadonlySet<string>,
): HistoryEntry {
  return {
    elements: elements.map((el) => structuredClone(el)),
    selectedIds: new Set(selectedIds),
  };
}

function hasStateChanged(
  before: HistoryEntry,
  currentElements: readonly ExcalidrawElement[],
): boolean {
  if (before.elements.length !== currentElements.length) return true;

  for (let i = 0; i < before.elements.length; i++) {
    const prev = before.elements[i];
    const curr = currentElements[i];
    if (!prev || !curr) return true;
    if (prev.id !== curr.id) return true;
    if (prev.version !== curr.version) return true;
    if (prev.x !== curr.x || prev.y !== curr.y) return true;
    if (prev.isDeleted !== curr.isDeleted) return true;
  }

  return false;
}

export function useHistory(deps: UseHistoryDeps): UseHistoryReturn {
  const { elements, replaceElements, selectedIds, replaceSelection, dirty } = deps;

  const undoStack = shallowRef<HistoryEntry[]>([]);
  const redoStack = shallowRef<HistoryEntry[]>([]);
  let pendingCheckpoint: HistoryEntry | null = null;

  const canUndo = computed(() => undoStack.value.length > 0);
  const canRedo = computed(() => redoStack.value.length > 0);

  function pushUndo(entry: HistoryEntry): void {
    undoStack.value.push(entry);
    if (undoStack.value.length > MAX_HISTORY) undoStack.value.shift();
    triggerRef(undoStack);
  }

  function clearRedoStack(): void {
    if (redoStack.value.length === 0) return;
    redoStack.value.length = 0;
    triggerRef(redoStack);
  }

  function restoreEntry(entry: HistoryEntry): void {
    replaceElements(entry.elements);
    replaceSelection(new Set(entry.selectedIds));
    dirty.markStaticDirty();
    dirty.markInteractiveDirty();
  }

  function recordAction(fn: () => void): void {
    const before = captureSnapshot(elements.value, selectedIds.value);
    fn();
    if (!hasStateChanged(before, elements.value)) return;
    pushUndo(before);
    clearRedoStack();
  }

  function saveCheckpoint(): void {
    if (pendingCheckpoint) return;
    pendingCheckpoint = captureSnapshot(elements.value, selectedIds.value);
  }

  function commitCheckpoint(): void {
    const checkpoint = pendingCheckpoint;
    pendingCheckpoint = null;
    if (!checkpoint) return;
    if (!hasStateChanged(checkpoint, elements.value)) return;
    pushUndo(checkpoint);
    clearRedoStack();
  }

  function discardCheckpoint(): void {
    const checkpoint = pendingCheckpoint;
    pendingCheckpoint = null;
    if (!checkpoint) return;
    restoreEntry(checkpoint);
  }

  function undo(): void {
    if (pendingCheckpoint) commitCheckpoint();

    const entry = undoStack.value.pop();
    if (!entry) return;

    const current = captureSnapshot(elements.value, selectedIds.value);
    redoStack.value.push(current);
    triggerRef(undoStack);
    triggerRef(redoStack);

    restoreEntry(entry);
  }

  function redo(): void {
    if (pendingCheckpoint) return;

    const entry = redoStack.value.pop();
    if (!entry) return;

    const current = captureSnapshot(elements.value, selectedIds.value);
    pushUndo(current);
    triggerRef(redoStack);

    restoreEntry(entry);
  }

  return {
    recordAction,
    saveCheckpoint,
    commitCheckpoint,
    discardCheckpoint,
    undo,
    redo,
    canUndo,
    canRedo,
    undoStack: undoStack as Readonly<ShallowRef<readonly HistoryEntry[]>>,
    redoStack: redoStack as Readonly<ShallowRef<readonly HistoryEntry[]>>,
  };
}
