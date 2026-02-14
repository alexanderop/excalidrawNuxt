import type { ActionId } from "../../shared/useActionRegistry";

export type ContextMenuType = "element" | "canvas";

export type ContextMenuItemDef = { type: "separator" } | { actionId: ActionId };

export function isSeparator(item: ContextMenuItemDef): item is { type: "separator" } {
  return "type" in item && item.type === "separator";
}
