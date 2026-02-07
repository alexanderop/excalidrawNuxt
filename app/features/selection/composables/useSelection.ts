import { shallowRef, computed } from 'vue'
import type { ShallowRef } from 'vue'
import type { ExcalidrawElement } from '~/features/elements/types'
import { getCommonBounds } from '../bounds'
import type { Bounds } from '../bounds'

export function useSelection(elements: ShallowRef<readonly ExcalidrawElement[]>) {
  const selectedIds = shallowRef<ReadonlySet<string>>(new Set())

  const selectedElements = computed(() =>
    elements.value.filter(el => selectedIds.value.has(el.id) && !el.isDeleted),
  )

  const selectionBounds = computed<Bounds | null>(() => {
    if (selectedElements.value.length === 0) return null
    return getCommonBounds(selectedElements.value)
  })

  function select(id: string): void {
    selectedIds.value = new Set([id])
  }

  function addToSelection(id: string): void {
    const next = new Set(selectedIds.value)
    next.add(id)
    selectedIds.value = next
  }

  function removeFromSelection(id: string): void {
    const next = new Set(selectedIds.value)
    next.delete(id)
    selectedIds.value = next
  }

  function toggleSelection(id: string): void {
    const next = new Set(selectedIds.value)
    const action = next.has(id) ? 'delete' : 'add'
    next[action](id)
    selectedIds.value = next
  }

  function clearSelection(): void {
    if (selectedIds.value.size === 0) return
    selectedIds.value = new Set()
  }

  function selectAll(): void {
    const ids = new Set(
      elements.value
        .filter(el => !el.isDeleted)
        .map(el => el.id),
    )
    selectedIds.value = ids
  }

  function isSelected(id: string): boolean {
    return selectedIds.value.has(id)
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
    selectAll,
    isSelected,
  }
}
