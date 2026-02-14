import type { ToolType } from "./toolTypes";
import { useDrawVue } from "../context";

// ── Action ID union ─────────────────────────────────────────────────
// Every registered action must have an ID from this type.
// Adding an actionId to a context menu / command palette / template
// without registering it will now be a compile error.

type ToolActionId = `tool:${ToolType}`;

type ActionActionId =
  | "action:delete"
  | "action:duplicate"
  | "action:select-all"
  | "action:group"
  | "action:ungroup";

type LayerActionId =
  | "layer:bring-to-front"
  | "layer:bring-forward"
  | "layer:send-backward"
  | "layer:send-to-back";

type ClipboardActionId = "clipboard:copy" | "clipboard:cut" | "clipboard:paste";

type StyleActionId = "style:copy-styles" | "style:paste-styles";

type SettingsActionId = "settings:toggle-theme" | "settings:toggle-grid";

type FlipActionId = "flip:horizontal" | "flip:vertical";

type HistoryActionId = "history:undo" | "history:redo";

export type ActionId =
  | ToolActionId
  | ActionActionId
  | LayerActionId
  | ClipboardActionId
  | StyleActionId
  | SettingsActionId
  | FlipActionId
  | HistoryActionId;

// ── Registry ────────────────────────────────────────────────────────

export interface ActionDefinition {
  id: ActionId;
  label: string;
  icon: string;
  kbds?: readonly string[];
  handler: () => void;
  enabled?: () => boolean;
}

export interface ActionRegistry {
  register: (actions: ActionDefinition[]) => void;
  get: (id: ActionId) => ActionDefinition | undefined;
  execute: (id: ActionId) => void;
  isEnabled: (id: ActionId) => boolean;
}

export function createActionRegistry(): ActionRegistry {
  const registry = new Map<ActionId, ActionDefinition>();

  function register(actions: ActionDefinition[]): void {
    for (const action of actions) {
      registry.set(action.id, action);
    }
  }

  function get(id: ActionId): ActionDefinition | undefined {
    return registry.get(id);
  }

  function execute(id: ActionId): void {
    const action = registry.get(id);
    if (!action) return;
    if (action.enabled && !action.enabled()) return;
    action.handler();
  }

  function isEnabled(id: ActionId): boolean {
    const action = registry.get(id);
    if (!action) return false;
    if (!action.enabled) return true;
    return action.enabled();
  }

  return { register, get, execute, isEnabled };
}

export function useActionRegistry(): ActionRegistry {
  return useDrawVue().actionRegistry;
}
