import { ref, shallowRef, computed, watch, onScopeDispose } from "vue";
import { useDebounceFn, useEventListener, useIntervalFn } from "@vueuse/core";
import {
  useDrawVue,
  hashElementsVersion,
  getNonDeletedElements,
  tryCatch,
  serializeFiles,
  restoreImageCache,
} from "@drawvue/core";
import { probeIndexedDB, delScene } from "./stores";
import {
  saveScene,
  loadScene,
  saveFiles,
  loadFiles,
  clearFiles,
  emergencySaveToLocalStorage,
  readStoreMetadata,
} from "./sceneStorage";
import type {
  PersistenceEvent,
  PersistenceEventType,
  SaveStatus,
  UsePersistenceReturn,
} from "./types";
import { EMERGENCY_BACKUP_KEY } from "./types";

export function usePersistence(): UsePersistenceReturn {
  const { elements, dirty, imageCache } = useDrawVue();

  // ── Reactive state ──────────────────────────────────────────────────
  const isRestored = ref(false);
  const saveStatus = ref<SaveStatus>("idle");
  const error = shallowRef<Error | null>(null);

  // ── Diagnostic state (was non-reactive, now refs for inspector) ─────
  const lastSavedHash = ref(0);
  const forwardVersionMode = ref(false);
  const hasPersistedStorage = ref(false);
  let watchPaused = false;

  // ── Live scene hash ─────────────────────────────────────────────────
  const sceneHash = computed(() =>
    hashElementsVersion(getNonDeletedElements(elements.elements.value)),
  );

  // ── Event log ───────────────────────────────────────────────────────
  const events = shallowRef<readonly PersistenceEvent[]>([]);
  let eventIdCounter = 0;

  function logEvent(type: PersistenceEventType, message: string): void {
    const event: PersistenceEvent = {
      id: ++eventIdCounter,
      type,
      timestamp: Date.now(),
      message,
    };
    const next = [...events.value, event];
    events.value = next.length > 50 ? next.slice(-50) : next;
    console.warn(`[persistence] ${type}: ${message}`);
  }

  // ── Save logic ──────────────────────────────────────────────────────

  async function executeSave(): Promise<void> {
    if (forwardVersionMode.value) {
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
    if (currentHash === lastSavedHash.value) {
      logEvent("save-skip", `hash unchanged (${currentHash})`);
      saveStatus.value = "idle";
      return;
    }

    saveStatus.value = "saving";
    logEvent("debounce", `fired — version changed (${lastSavedHash.value} → ${currentHash})`);

    const [result] = await Promise.all([
      saveScene(elements.elements.value),
      saveFiles(serializeFiles(imageCache.cache.value, elements.elements.value)),
    ]);

    if (!result.success) {
      saveStatus.value = "error";
      error.value = new Error(
        result.quotaExceeded
          ? "Storage quota exceeded — drawing safe in memory but won't persist"
          : "Failed to save drawing",
      );
      logEvent("error", error.value.message);
      return;
    }

    lastSavedHash.value = result.hash;
    error.value = null;
    saveStatus.value = "idle";
    logEvent("save", `completed — hash ${result.hash} — ${nonDeleted.length} elements`);

    // Safari eviction protection: request persistent storage on first successful save
    if (!hasPersistedStorage.value) {
      hasPersistedStorage.value = true;
      void navigator.storage?.persist?.();
    }
  }

  const scheduleSave = useDebounceFn(executeSave, 300, { maxWait: 1000 });

  function requestSave(): void {
    if (forwardVersionMode.value) {
      return;
    }

    saveStatus.value = "pending";
    logEvent("change", "detected — element change");
    void scheduleSave();
  }

  function flushSave(): void {
    // executeSave() is idempotent via hash comparison — safe to call even if
    // the debounced timer hasn't fired yet (double call is a no-op).
    void executeSave();
  }

  // ── Clear storage ───────────────────────────────────────────────────

  async function clearStorage(): Promise<void> {
    await delScene("scene:current");
    await delScene("scene:backup");
    await clearFiles();
    localStorage.removeItem(EMERGENCY_BACKUP_KEY);
    lastSavedHash.value = 0;
    logEvent("clear", "all persisted data cleared (IDB + localStorage)");
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

  // ── Watch image cache for additions (new uploads, bg removal results) ──
  watch(imageCache.cache, () => {
    if (!watchPaused) {
      requestSave();
    }
  });

  // ── Poll for in-place mutations (drag, resize, rotate, style) ──────
  // The watcher only fires when the ShallowRef array reference changes.
  // mutateElement() edits in place, so poll versionNonce hashes every 2s.
  useIntervalFn(() => {
    if (watchPaused || forwardVersionMode.value || !isRestored.value) return;
    const currentHash = hashElementsVersion(getNonDeletedElements(elements.elements.value));
    if (currentHash !== lastSavedHash.value && saveStatus.value !== "saving") {
      requestSave();
    }
  }, 2000);

  // ── File restore helper ────────────────────────────────────────────
  async function restoreFiles(): Promise<void> {
    const [filesError, files] = await loadFiles();
    if (filesError) {
      logEvent("error", `Failed to load files: ${filesError.message}`);
      return;
    }

    if (Object.keys(files).length === 0) return;

    const [restoreError] = await tryCatch(restoreImageCache(files, imageCache.addImage));
    if (restoreError) {
      logEvent("error", `Failed to restore image cache: ${restoreError.message}`);
      return;
    }
    logEvent("restore", `restored ${Object.keys(files).length} binary files`);
  }

  // ── Restore (runs immediately in setup, not onMounted) ──────────────
  void (async () => {
    const [probeError, available] = await tryCatch(probeIndexedDB());
    if (probeError) {
      logEvent("error", `IndexedDB probe failed: ${probeError.message}`);
      saveStatus.value = "unavailable";
      isRestored.value = true;
      return;
    }

    if (!available) {
      logEvent("probe", "IndexedDB not available");
      saveStatus.value = "unavailable";
      isRestored.value = true;
      return;
    }

    logEvent("probe", "IndexedDB available");

    watchPaused = true;

    const [loadError, loaded] = await tryCatch(loadScene());
    if (loadError) {
      logEvent("error", `Failed to load scene: ${loadError.message}`);
      saveStatus.value = "error";
      error.value = loadError;
      isRestored.value = true;
      watchPaused = false;
      return;
    }

    if (loaded.forwardVersion) {
      forwardVersionMode.value = true;
      logEvent(
        "restore",
        "Data has a newer schema version. Saves are disabled — please refresh this tab.",
      );
    }

    if (loaded.elements.length > 0) {
      elements.replaceElements(loaded.elements);
    }

    await restoreFiles();
    dirty.value?.markStaticDirty();

    lastSavedHash.value = hashElementsVersion(getNonDeletedElements(elements.elements.value));
    isRestored.value = true;

    logEvent("restore", `from ${loaded.source} — ${loaded.elements.length} elements loaded`);

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
    diagnostics: {
      lastSavedHash,
      sceneHash,
      forwardVersionMode,
      hasPersistedStorage,
      events,
      flushSave,
      clearStorage,
      readStoreMetadata,
    },
  };
}
