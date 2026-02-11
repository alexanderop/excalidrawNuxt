import { shallowRef, computed } from "vue";
import type { ComputedRef, ShallowRef } from "vue";
import type { ExcalidrawElement } from "~/features/elements/types";
import { getCommonBounds } from "../bounds";
import type { Bounds } from "../bounds";

interface UseSelectionReturn {
  selectedIds: ShallowRef<ReadonlySet<string>>;
  selectedElements: ComputedRef<ExcalidrawElement[]>;
  selectionBounds: ComputedRef<Bounds | null>;
  select: (id: string) => void;
  addToSelection: (id: string) => void;
  removeFromSelection: (id: string) => void;
  toggleSelection: (id: string) => void;
  clearSelection: () => void;
  replaceSelection: (ids: Set<string>) => void;
  selectAll: () => void;
  isSelected: (id: string) => boolean;
}

export function useSelection(
  elements: ShallowRef<readonly ExcalidrawElement[]>,
): UseSelectionReturn {
  const selectedIds = shallowRef<ReadonlySet<string>>(new Set());

  const selectedElements = computed(() =>
    elements.value.filter((el) => selectedIds.value.has(el.id) && !el.isDeleted),
  );

  const selectionBounds = computed<Bounds | null>(() => {
    if (selectedElements.value.length === 0) return null;
    return getCommonBounds(selectedElements.value);
  });

  function select(id: string): void {
    selectedIds.value = new Set([id]);
  }

  function addToSelection(id: string): void {
    const next = new Set(selectedIds.value);
    next.add(id);
    selectedIds.value = next;
  }

  function removeFromSelection(id: string): void {
    const next = new Set(selectedIds.value);
    next.delete(id);
    selectedIds.value = next;
  }

  function toggleSelection(id: string): void {
    if (selectedIds.value.has(id)) {
      removeFromSelection(id);
      return;
    }
    addToSelection(id);
  }

  function clearSelection(): void {
    if (selectedIds.value.size === 0) return;
    selectedIds.value = new Set();
  }

  function replaceSelection(ids: Set<string>): void {
    selectedIds.value = ids;
  }

  function selectAll(): void {
    const ids = new Set(elements.value.filter((el) => !el.isDeleted).map((el) => el.id));
    selectedIds.value = ids;
  }

  function isSelected(id: string): boolean {
    return selectedIds.value.has(id);
  }

  return {
    selectedIds,
    selectedElements,
    selectionBounds,
    select,
    addToSelection,
    removeFromSelection,
    toggleSelection,
    clearSelection,
    replaceSelection,
    selectAll,
    isSelected,
  };
}
