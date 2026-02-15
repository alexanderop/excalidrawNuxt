import type { ContextMenuItemDef } from "./types";

const separator: ContextMenuItemDef = { type: "separator" };

export const elementMenuItems: readonly ContextMenuItemDef[] = [
  { actionId: "clipboard:cut" },
  { actionId: "clipboard:copy" },
  { actionId: "clipboard:paste" },
  separator,
  { actionId: "style:copy-styles" },
  { actionId: "style:paste-styles" },
  separator,
  { actionId: "action:duplicate" },
  { actionId: "action:delete" },
  separator,
  { actionId: "layer:bring-to-front" },
  { actionId: "layer:bring-forward" },
  { actionId: "layer:send-backward" },
  { actionId: "layer:send-to-back" },
  separator,
  { actionId: "action:group" },
  { actionId: "action:ungroup" },
  separator,
  { actionId: "flip:horizontal" },
  { actionId: "flip:vertical" },
  separator,
  { actionId: "image:remove-background" },
];

export const canvasMenuItems: readonly ContextMenuItemDef[] = [
  { actionId: "clipboard:paste" },
  { actionId: "action:select-all" },
  separator,
  { actionId: "settings:toggle-grid" },
];
