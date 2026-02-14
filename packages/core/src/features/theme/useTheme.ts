import { computed, watchEffect, type Ref } from "vue";
import { createGlobalState, useLocalStorage } from "@vueuse/core";
import { useKeyboardShortcuts } from "../../shared/useKeyboardShortcuts";
import { THEME } from "./types";
import type { Theme } from "./types";

export const useTheme = createGlobalState(() => {
  const theme: Ref<Theme> = useLocalStorage<Theme>("excalidraw-theme", THEME.LIGHT);
  const isDark = computed(() => theme.value === THEME.DARK);

  function toggleTheme(): void {
    theme.value = theme.value === THEME.LIGHT ? THEME.DARK : THEME.LIGHT;
  }

  useKeyboardShortcuts({
    alt_shift_d: () => toggleTheme(),
  });

  if (typeof document !== "undefined") {
    watchEffect(() => {
      document.documentElement.classList.toggle("dark", theme.value === THEME.DARK);
    });
  }

  function $reset(): void {
    theme.value = THEME.LIGHT;
  }

  return { theme, isDark, toggleTheme, $reset };
});
