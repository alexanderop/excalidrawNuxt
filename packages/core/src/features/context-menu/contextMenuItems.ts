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
  { actionId: "link:edit" },
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
  { actionId: "export:save-image" },
  separator,
  { actionId: "image:remove-background" },
  { actionId: "image:split-objects" },
  { actionId: "image:crop" },
  { actionId: "image:reset-crop" },
];

export const canvasMenuItems: readonly ContextMenuItemDef[] = [
  { actionId: "clipboard:paste" },
  { actionId: "action:select-all" },
  separator,
  { actionId: "settings:toggle-grid" },
  separator,
  { actionId: "export:save-image" },
];
