import type { ShallowRef } from "vue";
import type { ExcalidrawElement } from "../types";
import { getOutermostGroupId } from "~/features/groups/groupUtils";

interface UseLayerOrderOptions {
  elements: ShallowRef<readonly ExcalidrawElement[]>;
  replaceElements: (newElements: readonly ExcalidrawElement[]) => void;
}

interface UseLayerOrderReturn {
  bringToFront: (ids: ReadonlySet<string>) => void;
  bringForward: (ids: ReadonlySet<string>) => void;
  sendBackward: (ids: ReadonlySet<string>) => void;
  sendToBack: (ids: ReadonlySet<string>) => void;
}

/**
 * Expand a set of element IDs to include all members of any groups
 * that contain at least one selected element.
 */
function expandToGroups(
  elements: readonly ExcalidrawElement[],
  ids: ReadonlySet<string>,
): ReadonlySet<string> {
  const groupIds = new Set<string>();

  for (const el of elements) {
    if (!ids.has(el.id)) continue;
    const groupId = getOutermostGroupId(el);
    if (groupId) groupIds.add(groupId);
  }

  if (groupIds.size === 0) return ids;

  const expanded = new Set(ids);
  for (const el of elements) {
    if (el.isDeleted) continue;
    const groupId = getOutermostGroupId(el);
    if (groupId && groupIds.has(groupId)) {
      expanded.add(el.id);
    }
  }
  return expanded;
}

/** Find the index of the first element whose ID is in the set, or -1 */
function findFirstSelectedIndex(
  elements: readonly ExcalidrawElement[],
  ids: ReadonlySet<string>,
): number {
  for (const [i, element] of elements.entries()) {
    if (ids.has(element!.id)) return i;
  }
  return -1;
}

/** Find the index of the last element whose ID is in the set, or -1 */
function findLastSelectedIndex(
  elements: readonly ExcalidrawElement[],
  ids: ReadonlySet<string>,
): number {
  for (let i = elements.length - 1; i >= 0; i--) {
    if (ids.has(elements[i]!.id)) return i;
  }
  return -1;
}

function splitElements(
  elements: readonly ExcalidrawElement[],
  selectedIds: ReadonlySet<string>,
): { selected: ExcalidrawElement[]; unselected: ExcalidrawElement[] } {
  const selected: ExcalidrawElement[] = [];
  const unselected: ExcalidrawElement[] = [];

  for (const el of elements) {
    const target = selectedIds.has(el.id) ? selected : unselected;
    target.push(el);
  }

  return { selected, unselected };
}

export function useLayerOrder(options: UseLayerOrderOptions): UseLayerOrderReturn {
  const { elements, replaceElements } = options;

  function bringToFront(ids: ReadonlySet<string>): void {
    if (ids.size === 0) return;
    const expandedIds = expandToGroups(elements.value, ids);
    const { selected, unselected } = splitElements(elements.value, expandedIds);
    if (selected.length === 0) return;
    replaceElements([...unselected, ...selected]);
  }

  function sendToBack(ids: ReadonlySet<string>): void {
    if (ids.size === 0) return;
    const expandedIds = expandToGroups(elements.value, ids);
    const { selected, unselected } = splitElements(elements.value, expandedIds);
    if (selected.length === 0) return;
    replaceElements([...selected, ...unselected]);
  }

  function bringForward(ids: ReadonlySet<string>): void {
    if (ids.size === 0) return;
    const expandedIds = expandToGroups(elements.value, ids);
    const all = elements.value;

    const highestSelectedIndex = findLastSelectedIndex(all, expandedIds);
    if (highestSelectedIndex === -1) return;
    if (highestSelectedIndex === all.length - 1) return;

    // Find the first unselected element above the topmost selected element
    let swapIndex = -1;
    for (let i = highestSelectedIndex + 1; i < all.length; i++) {
      if (!expandedIds.has(all[i]!.id)) {
        swapIndex = i;
        break;
      }
    }
    if (swapIndex === -1) return;

    // Move that unselected element to just below the lowest selected element
    const lowestSelectedIndex = findFirstSelectedIndex(all, expandedIds);
    const result = [...all];
    const [removed] = result.splice(swapIndex, 1);
    result.splice(lowestSelectedIndex, 0, removed!);
    replaceElements(result);
  }

  function sendBackward(ids: ReadonlySet<string>): void {
    if (ids.size === 0) return;
    const expandedIds = expandToGroups(elements.value, ids);
    const all = elements.value;

    const lowestSelectedIndex = findFirstSelectedIndex(all, expandedIds);
    if (lowestSelectedIndex === -1) return;
    if (lowestSelectedIndex === 0) return;

    // Find the first unselected element below the lowest selected element
    let swapIndex = -1;
    for (let i = lowestSelectedIndex - 1; i >= 0; i--) {
      if (!expandedIds.has(all[i]!.id)) {
        swapIndex = i;
        break;
      }
    }
    if (swapIndex === -1) return;

    // Move that unselected element to just above the highest selected element
    const highestSelectedIndex = findLastSelectedIndex(all, expandedIds);
    const result = [...all];
    const [removed] = result.splice(swapIndex, 1);
    result.splice(highestSelectedIndex, 0, removed!);
    replaceElements(result);
  }

  return {
    bringToFront,
    bringForward,
    sendBackward,
    sendToBack,
  };
}
