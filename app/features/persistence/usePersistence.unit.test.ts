import { nextTick } from "vue";
import { withDrawVue } from "@drawvue/core/test-utils";
import { createTestElement } from "@drawvue/core/test-utils";
import { usePersistence } from "./usePersistence";
import type { SaveStatus } from "./types";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("./stores", () => ({
  probeIndexedDB: vi.fn(),
  delScene: vi.fn().mockResolvedValue([null, undefined]),
}));

vi.mock("./sceneStorage", () => ({
  saveScene: vi.fn(),
  loadScene: vi.fn(),
  emergencySaveToLocalStorage: vi.fn(),
  readStoreMetadata: vi.fn().mockResolvedValue({ current: null, backup: null, emergency: null }),
}));

// Capture debounce and event listener callbacks
let debouncedFn!: (...args: unknown[]) => unknown;
const eventListenerHandlers: Record<string, () => void> = {};

vi.mock("@vueuse/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@vueuse/core")>();
  return {
    ...actual,
    useDebounceFn: vi.fn((fn: (...args: unknown[]) => unknown) => {
      debouncedFn = fn;
      return fn;
    }),
    useEventListener: vi.fn((target: unknown, event: string, handler: () => void) => {
      // Store by event name for lookup in tests
      const key =
        typeof target === "object" && target !== null && "hidden" in target
          ? `document:${event}`
          : event;
      eventListenerHandlers[key] = handler;
    }),
    useIntervalFn: vi.fn(),
  };
});

const { probeIndexedDB, delScene } = await import("./stores");
const mockedProbe = vi.mocked(probeIndexedDB);
const mockedDelScene = vi.mocked(delScene);
const { saveScene, loadScene, emergencySaveToLocalStorage } = await import("./sceneStorage");
const mockedSaveScene = vi.mocked(saveScene);
const mockedLoadScene = vi.mocked(loadScene);
const mockedEmergencySave = vi.mocked(emergencySaveToLocalStorage);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupDefaults(): void {
  mockedProbe.mockResolvedValue(true);
  mockedLoadScene.mockResolvedValue({ elements: [], source: "empty", forwardVersion: false });
  mockedSaveScene.mockResolvedValue({ success: true, hash: 123, quotaExceeded: false });
}

async function waitForRestore(ctx: { isRestored: { value: boolean } }): Promise<void> {
  await vi.waitFor(
    () => {
      expect(ctx.isRestored.value).toBe(true);
    },
    { timeout: 100 },
  );
}

async function triggerSave(): Promise<void> {
  await debouncedFn();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("usePersistence", () => {
  // eslint-disable-next-line vitest/no-hooks -- clearing mocks & stubs is necessary for isolated tests
  beforeEach(async () => {
    // Drain floating promises from previous test's onScopeDispose → flushSave → executeSave
    await new Promise((r) => setTimeout(r, 0));
    vi.clearAllMocks();
    // Stub `document` for node env — useEventListener(document, ...) evaluates the argument eagerly
    vi.stubGlobal("document", { hidden: false });
    // Reset captured handlers
    for (const key of Object.keys(eventListenerHandlers)) {
      delete eventListenerHandlers[key];
    }
  });

  // eslint-disable-next-line vitest/no-hooks -- cleanup global stubs
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("restore flow", () => {
    it("sets saveStatus=unavailable when IDB probe fails", async () => {
      mockedProbe.mockResolvedValue(false);

      using ctx = withDrawVue(() => usePersistence());
      await waitForRestore(ctx);

      expect(ctx.saveStatus.value).toBe("unavailable" satisfies SaveStatus);
      expect(ctx.isRestored.value).toBe(true);
    });

    it("enters forward version mode when schema ahead", async () => {
      mockedProbe.mockResolvedValue(true);
      mockedLoadScene.mockResolvedValue({
        elements: [],
        source: "indexeddb",
        forwardVersion: true,
      });
      mockedSaveScene.mockResolvedValue({ success: true, hash: 1, quotaExceeded: false });

      using ctx = withDrawVue(() => usePersistence());
      await waitForRestore(ctx);

      expect(ctx.isRestored.value).toBe(true);
      // Saves should be blocked — trigger a change and verify saveScene is not called
      ctx.drawVue.elements.addElement(createTestElement({ id: "new" }));
      await nextTick();
      await triggerSave();
      expect(mockedSaveScene).not.toHaveBeenCalled();
    });

    it("initializes lastSavedHash from restored elements", async () => {
      const el = createTestElement({ id: "hash-el" });
      mockedProbe.mockResolvedValue(true);
      mockedLoadScene.mockResolvedValue({
        elements: [el],
        source: "indexeddb",
        forwardVersion: false,
      });
      mockedSaveScene.mockResolvedValue({ success: true, hash: 1, quotaExceeded: false });

      using ctx = withDrawVue(() => usePersistence());
      await waitForRestore(ctx);

      // If we trigger save without modifying elements, hash should match
      // and save should be skipped (status goes idle, not saving)
      await triggerSave();
      expect(mockedSaveScene).not.toHaveBeenCalled();
      expect(ctx.saveStatus.value).toBe("idle" satisfies SaveStatus);
    });
  });

  describe("save scheduling", () => {
    it("does not save before restore completes", async () => {
      // Make probeIndexedDB hang (never resolves during this test)
      mockedProbe.mockReturnValue(new Promise(() => {}));

      using ctx = withDrawVue(() => usePersistence());
      await nextTick();
      expect(ctx.isRestored.value).toBe(false);

      // executeSave checks isRestored, should bail
      await triggerSave();
      expect(mockedSaveScene).not.toHaveBeenCalled();
    });

    it("does not save in forward version mode", async () => {
      mockedProbe.mockResolvedValue(true);
      mockedLoadScene.mockResolvedValue({
        elements: [],
        source: "indexeddb",
        forwardVersion: true,
      });

      using ctx = withDrawVue(() => usePersistence());
      await waitForRestore(ctx);

      ctx.drawVue.elements.addElement(createTestElement({ id: "blocked" }));
      await nextTick();
      await triggerSave();

      expect(mockedSaveScene).not.toHaveBeenCalled();
    });
  });

  describe("save execution", () => {
    it("sets error status on save failure", async () => {
      mockedProbe.mockResolvedValue(true);
      mockedLoadScene.mockResolvedValue({ elements: [], source: "empty", forwardVersion: false });
      mockedSaveScene.mockResolvedValue({ success: false, hash: 0, quotaExceeded: false });

      using ctx = withDrawVue(() => usePersistence());
      await waitForRestore(ctx);

      ctx.drawVue.elements.addElement(createTestElement({ id: "fail" }));
      await nextTick();
      await triggerSave();

      expect(ctx.saveStatus.value).toBe("error" satisfies SaveStatus);
      expect(ctx.error.value).toBeInstanceOf(Error);
      expect(ctx.error.value!.message).toBe("Failed to save drawing");
    });

    it("sets quota-exceeded error message", async () => {
      mockedProbe.mockResolvedValue(true);
      mockedLoadScene.mockResolvedValue({ elements: [], source: "empty", forwardVersion: false });
      mockedSaveScene.mockResolvedValue({ success: false, hash: 0, quotaExceeded: true });

      using ctx = withDrawVue(() => usePersistence());
      await waitForRestore(ctx);

      ctx.drawVue.elements.addElement(createTestElement({ id: "quota" }));
      await nextTick();
      await triggerSave();

      expect(ctx.saveStatus.value).toBe("error" satisfies SaveStatus);
      expect(ctx.error.value!.message).toContain("quota exceeded");
    });

    it("requests navigator.storage.persist on first save only", async () => {
      const persistMock = vi.fn();
      vi.stubGlobal("navigator", {
        storage: { persist: persistMock },
      });
      setupDefaults();

      using ctx = withDrawVue(() => usePersistence());
      await waitForRestore(ctx);

      // First save
      ctx.drawVue.elements.addElement(createTestElement({ id: "first" }));
      await nextTick();
      await triggerSave();
      expect(persistMock).toHaveBeenCalledTimes(1);

      // Second save — persist should not be called again
      mockedSaveScene.mockResolvedValue({ success: true, hash: 456, quotaExceeded: false });
      ctx.drawVue.elements.addElement(createTestElement({ id: "second" }));
      await nextTick();
      await triggerSave();
      expect(persistMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("page unload handlers", () => {
    it("beforeunload calls emergencySaveToLocalStorage", async () => {
      setupDefaults();

      using ctx = withDrawVue(() => usePersistence());
      await waitForRestore(ctx);
      expect(ctx.isRestored.value).toBe(true);

      const handler = eventListenerHandlers["beforeunload"];
      expect(handler).toBeDefined();
      handler!();

      expect(mockedEmergencySave).toHaveBeenCalled();
    });
  });

  describe("diagnostics", () => {
    it("exposes lastSavedHash ref that updates after save", async () => {
      setupDefaults();

      using ctx = withDrawVue(() => usePersistence());
      await waitForRestore(ctx);

      const hashAfterRestore = ctx.diagnostics.lastSavedHash.value;
      expect(hashAfterRestore).toBeGreaterThan(0);

      ctx.drawVue.elements.addElement(createTestElement({ id: "hash-test" }));
      await nextTick();
      await triggerSave();

      expect(ctx.diagnostics.lastSavedHash.value).toBe(123);
      expect(ctx.diagnostics.lastSavedHash.value).not.toBe(hashAfterRestore);
    });

    it("exposes forwardVersionMode ref set during forward-version restore", async () => {
      mockedProbe.mockResolvedValue(true);
      mockedLoadScene.mockResolvedValue({
        elements: [],
        source: "indexeddb",
        forwardVersion: true,
      });

      using ctx = withDrawVue(() => usePersistence());
      await waitForRestore(ctx);

      expect(ctx.diagnostics.forwardVersionMode.value).toBe(true);
    });

    it("exposes sceneHash computed that changes when elements change", async () => {
      setupDefaults();

      using ctx = withDrawVue(() => usePersistence());
      await waitForRestore(ctx);

      const initialHash = ctx.diagnostics.sceneHash.value;
      ctx.drawVue.elements.addElement(createTestElement({ id: "scene-hash-test" }));
      await nextTick();

      expect(ctx.diagnostics.sceneHash.value).not.toBe(initialHash);
    });

    it("caps event log at 50 entries", async () => {
      setupDefaults();
      // Make save always succeed with a new hash to generate events
      let hashCounter = 100;
      mockedSaveScene.mockImplementation(async () => ({
        success: true,
        hash: hashCounter++,
        quotaExceeded: false,
      }));

      // Suppress the ~180 console.warn lines from 60 save cycles
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      using ctx = withDrawVue(() => usePersistence());
      await waitForRestore(ctx);

      // Trigger many save cycles to generate events
      for (let i = 0; i < 60; i++) {
        ctx.drawVue.elements.addElement(createTestElement({ id: `cap-${i}` }));
        await nextTick();
        await triggerSave();
      }

      expect(ctx.diagnostics.events.value.length).toBeLessThanOrEqual(50);
      warnSpy.mockRestore();
    });

    it("clearStorage calls delScene and removes localStorage key", async () => {
      setupDefaults();
      const removeItemMock = vi.fn();
      vi.stubGlobal("localStorage", {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: removeItemMock,
      });

      using ctx = withDrawVue(() => usePersistence());
      await waitForRestore(ctx);

      await ctx.diagnostics.clearStorage();

      expect(mockedDelScene).toHaveBeenCalledWith("scene:current");
      expect(mockedDelScene).toHaveBeenCalledWith("scene:backup");
      expect(removeItemMock).toHaveBeenCalledWith("drawvue-emergency-backup");
      expect(ctx.diagnostics.lastSavedHash.value).toBe(0);
    });
  });
});
