import type { ActionId } from "~/shared/useActionRegistry";

export interface CommandGroupDef {
  id: string;
  label: string;
  actionIds: ActionId[];
}

export const COMMAND_GROUP_DEFS: CommandGroupDef[] = [
  {
    id: "tools",
    label: "Tools",
    actionIds: [
      "tool:selection",
      "tool:hand",
      "tool:rectangle",
      "tool:diamond",
      "tool:ellipse",
      "tool:arrow",
      "tool:text",
      "tool:code",
      "tool:line",
      "tool:image",
    ],
  },
  {
    id: "actions",
    label: "Actions",
    actionIds: ["action:delete", "action:select-all", "action:group", "action:ungroup"],
  },
  {
    id: "layers",
    label: "Layers",
    actionIds: [
      "layer:bring-to-front",
      "layer:bring-forward",
      "layer:send-backward",
      "layer:send-to-back",
    ],
  },
  {
    id: "settings",
    label: "Settings",
    actionIds: ["settings:toggle-theme", "style:copy-styles", "style:paste-styles"],
  },
];
