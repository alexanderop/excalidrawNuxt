import { shallowRef } from "vue";
import type { ShallowRef } from "vue";
import { createEventHook } from "@vueuse/core";
import type { ToolType } from "./types";
import { useDrawVue } from "../../context";

export interface UseToolStoreReturn {
  activeTool: ShallowRef<ToolType>;
  setTool: (tool: ToolType) => void;
  onBeforeToolChange: (fn: () => void) => void;
  $reset: () => void;
}

export function createToolStore(): UseToolStoreReturn {
  const activeTool = shallowRef<ToolType>("selection");
  const { on: onBeforeToolChange, trigger: triggerBeforeChange } = createEventHook<void>();

  function setTool(tool: ToolType): void {
    triggerBeforeChange();
    activeTool.value = tool;
  }

  function $reset(): void {
    activeTool.value = "selection";
  }

  return { activeTool, setTool, onBeforeToolChange, $reset };
}

/** Key-to-tool mapping, exported for use when binding keyboard shortcuts externally. */
export const KEY_TO_TOOL: Record<string, ToolType> = {
  r: "rectangle",
  o: "ellipse",
  d: "diamond",
  v: "selection",
  h: "hand",
  "1": "selection",
  "2": "rectangle",
  "3": "diamond",
  "4": "ellipse",
  a: "arrow",
  "5": "arrow",
  l: "line",
  "8": "line",
  t: "text",
  "6": "text",
  p: "freedraw",
  x: "freedraw",
  "7": "freedraw",
  c: "code",
  "0": "code",
  i: "image",
  "9": "image",
};

export function useToolStore(): UseToolStoreReturn {
  return useDrawVue().tool;
}
