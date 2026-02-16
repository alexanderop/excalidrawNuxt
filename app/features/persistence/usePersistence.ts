import { ref, shallowRef, watch, onScopeDispose } from "vue";
import { useDebounceFn, useEventListener, useIntervalFn } from "@vueuse/core";
import { useDrawVue, hashElementsVersion, getNonDeletedElements, tryCatch } from "@drawvue/core";
import { probeIndexedDB } from "./stores";
import { saveScene, loadScene, emergencySaveToLocalStorage } from "./sceneStorage";
import type { SaveStatus, UsePersistenceReturn } from "./types";

export function usePersistence(): UsePersistenceReturn {
  const { elements, dirty } = useDrawVue();

  // ── Reactive state ──────────────────────────────────────────────────
  const isRestored = ref(false);
  const saveStatus = ref<SaveStatus>("idle");
  const error = shallowRef<Error | null>(null);

  // ── Local (non-reactive) state ──────────────────────────────────────
  let lastSavedHash = 0;
  let forwardVersionMode = false;
  let hasPersistedStorage = false;
  let watchPaused = false;

  // ── Save logic ──────────────────────────────────────────────────────

  async function executeSave(): Promise<void> {
    if (forwardVersionMode) {
      return;
    }

    if (!isRestored.value) {
      return;
    }

    if (saveStatus.value === "unavailable") {
      return;
    }

    const nonDeleted = getNonDeletedElements(elements.elements.value);
    const currentHash = hashElementsVersion(nonDeleted);
    if (currentHash === lastSavedHash) {
      saveStatus.value = "idle";
      return;
    }

    saveStatus.value = "saving";

    const result = await saveScene(elements.elements.value);

    if (!result.success) {
      saveStatus.value = "error";
      error.value = new Error(
        result.quotaExceeded
          ? "Storage quota exceeded — drawing safe in memory but won't persist"
          : "Failed to save drawing",
      );
      return;
    }

    lastSavedHash = result.hash;
    error.value = null;
    saveStatus.value = "idle";

    // Safari eviction protection: request persistent storage on first successful save
    if (!hasPersistedStorage) {
      hasPersistedStorage = true;
      void navigator.storage?.persist?.();
    }
  }

  const scheduleSave = useDebounceFn(executeSave, 300, { maxWait: 1000 });

  function requestSave(): void {
    if (forwardVersionMode) {
      return;
    }

    saveStatus.value = "pending";
    void scheduleSave();
  }

  function flushSave(): void {
    // executeSave() is idempotent via hash comparison — safe to call even if
    // the debounced timer hasn't fired yet (double call is a no-op).
    void executeSave();
  }

  // ── Watch elements for changes ──────────────────────────────────────
  watch(
    () => elements.elements.value,
    () => {
      if (!watchPaused) {
        requestSave();
      }
    },
  );

  // ── Poll for in-place mutations (drag, resize, rotate, style) ──────
  // The watcher only fires when the ShallowRef array reference changes.
  // mutateElement() edits in place, so poll versionNonce hashes every 2s.
  useIntervalFn(() => {
    if (watchPaused || forwardVersionMode || !isRestored.value) return;
    const currentHash = hashElementsVersion(getNonDeletedElements(elements.elements.value));
    if (currentHash !== lastSavedHash && saveStatus.value !== "saving") {
      requestSave();
    }
  }, 2000);

  // ── Restore (runs immediately in setup, not onMounted) ──────────────
  void (async () => {
    const [probeError, available] = await tryCatch(probeIndexedDB());
    if (probeError) {
      console.error("[persistence] IndexedDB probe failed:", probeError.message);
      saveStatus.value = "unavailable";
      isRestored.value = true;
      return;
    }

    if (!available) {
      saveStatus.value = "unavailable";
      isRestored.value = true;
      return;
    }

    watchPaused = true;

    const [loadError, loaded] = await tryCatch(loadScene());
    if (loadError) {
      console.error("[persistence] Failed to load scene:", loadError.message);
      saveStatus.value = "error";
      error.value = loadError;
      isRestored.value = true;
      watchPaused = false;
      return;
    }

    if (loaded.forwardVersion) {
      forwardVersionMode = true;
      console.warn(
        "[persistence] Data has a newer schema version. Saves are disabled — please refresh this tab.",
      );
    }

    if (loaded.elements.length > 0) {
      elements.replaceElements(loaded.elements);

      dirty.value?.markStaticDirty();
    }

    lastSavedHash = hashElementsVersion(getNonDeletedElements(elements.elements.value));
    isRestored.value = true;

    watchPaused = false;
  })();

  // ── Page unload handlers ────────────────────────────────────────────
  // flushSave() is fire-and-forget: the async IDB write may not complete
  // during unload. The synchronous emergencySaveToLocalStorage() on
  // beforeunload is the actual safety net for tab close / navigation.

  useEventListener(document, "visibilitychange", () => {
    if (document.hidden) {
      flushSave();
    }
  });

  useEventListener(globalThis, "pagehide", () => flushSave());

  useEventListener(globalThis, "beforeunload", () =>
    emergencySaveToLocalStorage(elements.elements.value),
  );

  // ── Cleanup: flush pending save on scope disposal ───────────────────

  onScopeDispose(() => flushSave());

  // ── Return ──────────────────────────────────────────────────────────

  return {
    isRestored,
    saveStatus,
    error,
  };
}
