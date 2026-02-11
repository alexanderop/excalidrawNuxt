import type { ContextMenuEntry } from "./types";
import { useStyleClipboard } from "~/features/properties/composables/useStyleClipboard";

const separator: ContextMenuEntry = { type: "separator" };

export const elementMenuItems: readonly ContextMenuEntry[] = [
  {
    label: "Cut",
    kbds: ["meta", "X"],
    action: () => {
      /* stub: clipboard not yet implemented */
    },
  },
  {
    label: "Copy",
    kbds: ["meta", "C"],
    action: () => {
      /* stub: clipboard not yet implemented */
    },
  },
  {
    label: "Paste",
    kbds: ["meta", "V"],
    action: () => {
      /* stub: clipboard not yet implemented */
    },
  },
  separator,
  {
    label: "Copy styles",
    kbds: ["meta", "alt", "C"],
    action: (ctx) => {
      if (ctx.selectedElements.length === 0) return;
      const { copyStyles } = useStyleClipboard();
      copyStyles(ctx.selectedElements[0]!);
    },
  },
  {
    label: "Paste styles",
    kbds: ["meta", "alt", "V"],
    predicate: () => {
      const { hasStoredStyles } = useStyleClipboard();
      return hasStoredStyles.value;
    },
    action: (ctx) => {
      const { pasteStyles } = useStyleClipboard();
      pasteStyles([...ctx.selectedElements], ctx.markDirty);
    },
  },
  separator,
  {
    label: "Duplicate",
    kbds: ["meta", "D"],
    action: () => {
      /* stub: duplicate not yet implemented */
    },
  },
  {
    label: "Delete",
    kbds: ["delete"],
    action: () => {
      /* stub: delete via context menu not yet wired */
    },
  },
  separator,
  {
    label: "Bring to front",
    kbds: ["meta", "shift", "]"],
    action: () => {
      /* stub: z-order not yet implemented */
    },
  },
  {
    label: "Bring forward",
    kbds: ["meta", "]"],
    action: () => {
      /* stub: z-order not yet implemented */
    },
  },
  {
    label: "Send backward",
    kbds: ["meta", "["],
    action: () => {
      /* stub: z-order not yet implemented */
    },
  },
  {
    label: "Send to back",
    kbds: ["meta", "shift", "["],
    action: () => {
      /* stub: z-order not yet implemented */
    },
  },
  separator,
  {
    label: "Group",
    kbds: ["meta", "G"],
    action: () => {
      /* stub: group via context menu not yet wired */
    },
  },
  {
    label: "Ungroup",
    kbds: ["meta", "shift", "G"],
    predicate: (ctx) => ctx.hasGroups,
    action: () => {
      /* stub: ungroup via context menu not yet wired */
    },
  },
  separator,
  {
    label: "Flip horizontal",
    kbds: ["shift", "H"],
    action: () => {
      /* stub: flip not yet implemented */
    },
  },
  {
    label: "Flip vertical",
    kbds: ["shift", "V"],
    action: () => {
      /* stub: flip not yet implemented */
    },
  },
];

export const canvasMenuItems: readonly ContextMenuEntry[] = [
  {
    label: "Paste",
    kbds: ["meta", "V"],
    action: () => {
      /* stub: clipboard not yet implemented */
    },
  },
  {
    label: "Select all",
    kbds: ["meta", "A"],
    action: () => {
      /* stub: select all via context menu not yet wired */
    },
  },
  separator,
  {
    label: "Toggle grid",
    kbds: ["meta", "'"],
    action: () => {
      /* stub: grid toggle not yet implemented */
    },
  },
];
