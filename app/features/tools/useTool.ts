import { shallowRef } from "vue";
import { createGlobalState, createEventHook } from "@vueuse/core";
import { defineShortcuts } from "#imports";
import type { ToolType } from "./types";

const KEY_TO_TOOL: Record<string, ToolType> = {
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
  c: "code",
  "7": "code",
  i: "image",
  "9": "image",
};

export const useToolStore = createGlobalState(() => {
  const activeTool = shallowRef<ToolType>("selection");
  const { on: onBeforeToolChange, trigger: triggerBeforeChange } = createEventHook<void>();

  function setTool(tool: ToolType): void {
    triggerBeforeChange();
    activeTool.value = tool;
  }

  defineShortcuts(
    Object.fromEntries(
      Object.entries(KEY_TO_TOOL).map(([key, tool]) => [key, () => setTool(tool)]),
    ),
  );

  function $reset(): void {
    activeTool.value = "selection";
  }

  return { activeTool, setTool, onBeforeToolChange, $reset };
});
