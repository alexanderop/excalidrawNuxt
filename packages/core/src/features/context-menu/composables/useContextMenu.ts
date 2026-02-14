import { ref, computed, type Ref, type ComputedRef } from "vue";
import { isSeparator, type ContextMenuType, type ContextMenuItemDef } from "../types";
import { elementMenuItems, canvasMenuItems } from "../contextMenuItems";
import {
  type ActionDefinition,
  type ActionId,
  type ActionRegistry,
} from "../../../shared/useActionRegistry";

export interface NuxtUiMenuItem {
  label?: string;
  type?: "separator";
  kbds?: string[];
  onSelect?: (e: Event) => void;
}

interface UseContextMenuReturn {
  menuType: Ref<ContextMenuType>;
  items: ComputedRef<NuxtUiMenuItem[]>;
}

function resolveItem(
  item: ContextMenuItemDef,
  get: (id: ActionId) => ActionDefinition | undefined,
  execute: (id: ActionId) => void,
): NuxtUiMenuItem | null {
  if (isSeparator(item)) return { type: "separator" };

  const action = get(item.actionId);
  if (!action) return null;
  if (action.enabled && !action.enabled()) return null;

  return {
    label: action.label,
    kbds: action.kbds ? [...action.kbds] : undefined,
    onSelect: () => execute(item.actionId),
  };
}

function cleanSeparators(items: NuxtUiMenuItem[]): NuxtUiMenuItem[] {
  const collapsed: NuxtUiMenuItem[] = [];
  for (const item of items) {
    const lastIsSeparator = collapsed.length > 0 && collapsed.at(-1)!.type === "separator";
    if (item.type === "separator" && lastIsSeparator) continue;
    collapsed.push(item);
  }

  const start = collapsed.findIndex((item) => item.type !== "separator");
  if (start === -1) return [];

  let end = collapsed.length - 1;
  while (end > start && collapsed[end]!.type === "separator") end--;

  return collapsed.slice(start, end + 1);
}

export function useContextMenu(actionRegistry: ActionRegistry): UseContextMenuReturn {
  const { get, execute } = actionRegistry;

  const menuType = ref<ContextMenuType>("canvas");

  const items = computed<NuxtUiMenuItem[]>(() => {
    const rawItems = menuType.value === "element" ? elementMenuItems : canvasMenuItems;

    const resolved = rawItems
      .map((item) => resolveItem(item, get, execute))
      .filter((item): item is NuxtUiMenuItem => item !== null);

    return cleanSeparators(resolved);
  });

  return { menuType, items };
}
