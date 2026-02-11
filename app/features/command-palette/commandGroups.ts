export interface CommandItem {
  id: string;
  label: string;
  icon: string;
  kbds?: string[];
}

export interface CommandGroup {
  id: string;
  label: string;
  items: CommandItem[];
}

export const COMMAND_GROUPS: CommandGroup[] = [
  {
    id: "tools",
    label: "Tools",
    items: [
      { id: "tool:selection", label: "Selection", icon: "i-lucide-mouse-pointer", kbds: ["V"] },
      { id: "tool:hand", label: "Hand", icon: "i-lucide-hand", kbds: ["H"] },
      { id: "tool:rectangle", label: "Rectangle", icon: "i-lucide-square", kbds: ["R"] },
      { id: "tool:diamond", label: "Diamond", icon: "i-lucide-diamond", kbds: ["D"] },
      { id: "tool:ellipse", label: "Ellipse", icon: "i-lucide-circle", kbds: ["O"] },
      { id: "tool:arrow", label: "Arrow", icon: "i-lucide-arrow-right", kbds: ["A"] },
      { id: "tool:text", label: "Text", icon: "i-lucide-type", kbds: ["T"] },
      { id: "tool:code", label: "Code", icon: "i-lucide-code", kbds: ["C"] },
      { id: "tool:line", label: "Line", icon: "i-lucide-minus", kbds: ["L"] },
      { id: "tool:image", label: "Image", icon: "i-lucide-image", kbds: ["I"] },
    ],
  },
  {
    id: "actions",
    label: "Actions",
    items: [
      { id: "action:delete", label: "Delete", icon: "i-lucide-trash-2", kbds: ["delete"] },
      {
        id: "action:select-all",
        label: "Select All",
        icon: "i-lucide-box-select",
        kbds: ["meta", "A"],
      },
      { id: "action:group", label: "Group", icon: "i-lucide-group", kbds: ["meta", "G"] },
      {
        id: "action:ungroup",
        label: "Ungroup",
        icon: "i-lucide-ungroup",
        kbds: ["meta", "shift", "G"],
      },
    ],
  },
  {
    id: "layers",
    label: "Layers",
    items: [
      {
        id: "layer:bring-to-front",
        label: "Bring to Front",
        icon: "i-lucide-bring-to-front",
        kbds: ["meta", "shift", "]"],
      },
      {
        id: "layer:bring-forward",
        label: "Bring Forward",
        icon: "i-lucide-move-up",
        kbds: ["meta", "]"],
      },
      {
        id: "layer:send-backward",
        label: "Send Backward",
        icon: "i-lucide-move-down",
        kbds: ["meta", "["],
      },
      {
        id: "layer:send-to-back",
        label: "Send to Back",
        icon: "i-lucide-send-to-back",
        kbds: ["meta", "shift", "["],
      },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    items: [
      {
        id: "settings:toggle-theme",
        label: "Toggle Theme",
        icon: "i-lucide-sun-moon",
        kbds: ["alt", "shift", "D"],
      },
      {
        id: "style:copy-styles",
        label: "Copy Styles",
        icon: "i-lucide-paintbrush",
        kbds: ["meta", "alt", "C"],
      },
      {
        id: "style:paste-styles",
        label: "Paste Styles",
        icon: "i-lucide-clipboard-paste",
        kbds: ["meta", "alt", "V"],
      },
    ],
  },
];
