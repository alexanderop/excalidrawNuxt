import { ref, type Ref } from "vue";
import type { ActionRegistry, ActionId } from "../../shared/useActionRegistry";
import { useDrawVue } from "../../context";

export interface CommandPaletteState {
  isOpen: Ref<boolean>;
  execute: (id: ActionId) => void;
}

export function createCommandPalette(actionRegistry: ActionRegistry): CommandPaletteState {
  const isOpen = ref(false);

  function execute(id: ActionId): void {
    actionRegistry.execute(id);
    isOpen.value = false;
  }

  return { isOpen, execute };
}

export function useCommandPalette(): CommandPaletteState {
  return useDrawVue().commandPalette;
}
