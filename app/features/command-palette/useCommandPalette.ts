import { ref, type Ref } from "vue";
import { createGlobalState } from "@vueuse/core";
import { useActionRegistry, type ActionId } from "~/shared/useActionRegistry";

interface CommandPaletteState {
  isOpen: Ref<boolean>;
  execute: (id: ActionId) => void;
}

export const useCommandPalette = createGlobalState((): CommandPaletteState => {
  const isOpen = ref(false);
  const { execute: registryExecute } = useActionRegistry();

  function execute(id: ActionId): void {
    registryExecute(id);
    isOpen.value = false;
  }

  return { isOpen, execute };
});
