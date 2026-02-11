import { shallowRef } from "vue";
import type { ShallowRef } from "vue";
import type { ExcalidrawElement, GroupId } from "~/features/elements/types";
import { mutateElement } from "~/features/elements/mutateElement";
import { generateId } from "~/shared/random";
import {
  expandSelectionToGroups,
  isSelectedViaGroup as isSelectedViaGroupUtil,
  addToGroup,
  removeFromGroups,
  elementsAreInSameGroup,
  reorderElementsForGroup,
} from "../groupUtils";

interface UseGroupsOptions {
  elements: ShallowRef<readonly ExcalidrawElement[]>;
  selectedIds: ShallowRef<ReadonlySet<string>>;
  selectedElements: () => readonly ExcalidrawElement[];
  replaceSelection: (ids: Set<string>) => void;
  replaceElements: (elements: readonly ExcalidrawElement[]) => void;
  markStaticDirty: () => void;
  markInteractiveDirty: () => void;
}

interface UseGroupsReturn {
  selectedGroupIds: ShallowRef<ReadonlySet<GroupId>>;
  groupSelection: () => void;
  ungroupSelection: () => void;
  isSelectedViaGroup: (element: ExcalidrawElement) => boolean;
  expandSelectionForGroups: () => void;
}

export function useGroups(options: UseGroupsOptions): UseGroupsReturn {
  const {
    elements,
    selectedIds,
    selectedElements,
    replaceSelection,
    replaceElements,
    markStaticDirty,
    markInteractiveDirty,
  } = options;

  const selectedGroupIds = shallowRef<ReadonlySet<GroupId>>(new Set());

  function expandSelectionForGroups(): void {
    const result = expandSelectionToGroups(elements.value, selectedIds.value);
    replaceSelection(new Set(result.elementIds));
    selectedGroupIds.value = result.groupIds;
    markInteractiveDirty();
  }

  function groupSelection(): void {
    const selected = selectedElements();
    if (selected.length < 2) return;
    if (elementsAreInSameGroup(selected)) return;

    const newGroupId = generateId();

    for (const el of selected) {
      mutateElement(el, { groupIds: addToGroup(el.groupIds, newGroupId) });
    }

    const groupElementIds = new Set(selected.map((el) => el.id));
    replaceElements(reorderElementsForGroup(elements.value, groupElementIds));

    selectedGroupIds.value = new Set([newGroupId]);
    markStaticDirty();
    markInteractiveDirty();
  }

  function ungroupSelection(): void {
    if (selectedGroupIds.value.size === 0) return;

    for (const el of elements.value) {
      if (!el.groupIds.some((id) => selectedGroupIds.value.has(id))) continue;
      mutateElement(el, {
        groupIds: removeFromGroups(el.groupIds, selectedGroupIds.value),
      });
    }

    selectedGroupIds.value = new Set();
    markStaticDirty();
    markInteractiveDirty();
  }

  function isSelectedViaGroup(element: ExcalidrawElement): boolean {
    return isSelectedViaGroupUtil(element, selectedGroupIds.value);
  }

  return {
    selectedGroupIds,
    groupSelection,
    ungroupSelection,
    isSelectedViaGroup,
    expandSelectionForGroups,
  };
}
