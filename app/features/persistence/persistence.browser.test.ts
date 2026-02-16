import { nextTick } from "vue";
import { render } from "vitest-browser-vue";
import { onTestFinished } from "vitest";
import { createStore, get as idbGet, set as idbSet, clear as idbClear } from "idb-keyval";
import { reseed, restoreSeed } from "@drawvue/core/test-utils";
import PersistenceTestHarness from "~/__test-utils__/browser/PersistenceTestHarness.vue";
import { waitForCanvasReady } from "~/__test-utils__/browser/waiters";
import { API } from "~/__test-utils__/browser/api";
import { DB_NAME, STORE_NAME, CURRENT_SCHEMA_VERSION, EMERGENCY_BACKUP_KEY } from "./types";
import type { PersistedScene } from "./types";

// ---------------------------------------------------------------------------
// IDB helpers — direct access for test setup & verification
// ---------------------------------------------------------------------------

const testSceneStore = createStore(DB_NAME, STORE_NAME);

async function clearStores(): Promise<void> {
  await idbClear(testSceneStore);
  localStorage.removeItem(EMERGENCY_BACKUP_KEY);
}

async function getPersistedScene(key: string): Promise<PersistedScene | undefined> {
  return idbGet<PersistedScene>(key, testSceneStore);
}

async function setPersistedScene(key: string, scene: PersistedScene): Promise<void> {
  return idbSet(key, scene, testSceneStore);
}

// ---------------------------------------------------------------------------
// Mount helper
// ---------------------------------------------------------------------------

let currentScreen: ReturnType<typeof render> | null = null;

async function mountFresh(): Promise<ReturnType<typeof render>> {
  // Unmount previous instance BEFORE rendering new one, so the old persistence
  // instance's onScopeDispose doesn't flush a save that overwrites our IDB setup data.
  if (currentScreen) {
    currentScreen.unmount();
    currentScreen = null;
    // Let disposal side-effects (flushSave) settle
    await nextTick();
  }

  reseed();
  onTestFinished(() => restoreSeed());

  const screen = render(PersistenceTestHarness);
  currentScreen = screen;
  await waitForCanvasReady();
  return screen;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("persistence", () => {
  beforeEach(async () => {
    // Unmount before clearing stores so the old persistence instance can't flush a save
    if (currentScreen) {
      currentScreen.unmount();
      currentScreen = null;
      await nextTick();
    }
    await clearStores();
  });

  describe("first visit", () => {
    it("shows empty canvas when no persisted data", async () => {
      await mountFresh();
      expect(API.elements).toHaveLength(0);
    });
  });

  describe("save flow", () => {
    it("persists drawn rectangle to IDB after debounce", async () => {
      await mountFresh();

      API.addElement({ id: "rect-1", x: 10, y: 20, width: 100, height: 50 });

      // Wait for debounced save (300ms debounce + margin)
      await expect
        .poll(
          async () => {
            const scene = await getPersistedScene("scene:current");
            return scene?.elements?.some((el) => el.id === "rect-1") ?? false;
          },
          { timeout: 3000 },
        )
        .toBe(true);
    });

    it("persists multiple elements", async () => {
      await mountFresh();

      API.addElement({ id: "el-a" });
      API.addElement({ id: "el-b" });

      await expect
        .poll(
          async () => {
            const scene = await getPersistedScene("scene:current");
            return scene?.elements?.length ?? 0;
          },
          { timeout: 3000 },
        )
        .toBeGreaterThanOrEqual(2);
    });

    it("only persists non-deleted elements", async () => {
      await mountFresh();

      API.addElement({ id: "will-delete" });
      API.addElement({ id: "stays" });

      // Wait for initial save with both elements
      await expect
        .poll(
          async () => {
            const scene = await getPersistedScene("scene:current");
            return scene?.elements?.length ?? 0;
          },
          { timeout: 3000 },
        )
        .toBeGreaterThanOrEqual(2);

      // Soft-delete the first element via replaceElements (persistence serializes non-deleted only)
      const h = API.h;
      const updated = h.elements.value.map((e) =>
        e.id === "will-delete"
          ? { ...e, isDeleted: true, version: (e.version ?? 0) + 1, versionNonce: Date.now() }
          : e,
      );
      h.replaceElements(updated);

      // Wait for re-save — the saved scene should only contain non-deleted elements
      await expect
        .poll(
          async () => {
            const scene = await getPersistedScene("scene:current");
            if (!scene) return false;
            // After save, deleted elements are stripped by serializeElements
            return (
              scene.elements.every((e) => e.id !== "will-delete") &&
              scene.elements.some((e) => e.id === "stays")
            );
          },
          { timeout: 5000 },
        )
        .toBe(true);
    });
  });

  describe("restore flow", () => {
    it("restores elements from IDB when mounting", async () => {
      // Pre-populate IDB
      const scene: PersistedScene = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        elements: [
          {
            id: "pre-rect",
            type: "rectangle",
            x: 0,
            y: 0,
            width: 100,
            height: 100,
          } as PersistedScene["elements"][0],
        ],
        savedAt: Date.now(),
        elementCount: 1,
      };
      await setPersistedScene("scene:current", scene);

      await mountFresh();

      // Wait for async restore to complete
      await expect
        .poll(() => API.elements.some((el) => el.id === "pre-rect"), { timeout: 3000 })
        .toBe(true);
    });

    it("restores element properties (position, size)", async () => {
      const scene: PersistedScene = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        elements: [
          {
            id: "props-rect",
            type: "rectangle",
            x: 42,
            y: 84,
            width: 200,
            height: 150,
            strokeColor: "#ff0000",
          } as PersistedScene["elements"][0],
        ],
        savedAt: Date.now(),
        elementCount: 1,
      };
      await setPersistedScene("scene:current", scene);

      await mountFresh();

      // Wait for async restore
      await expect
        .poll(() => API.elements.some((e) => e.id === "props-rect"), { timeout: 3000 })
        .toBe(true);

      const el = API.elements.find((e) => e.id === "props-rect")!;
      expect(el.x).toBe(42);
      expect(el.y).toBe(84);
      expect(el.width).toBe(200);
      expect(el.height).toBe(150);
    });
  });

  describe("save-restore round trip", () => {
    it("data survives component remount", async () => {
      const screen = await mountFresh();

      API.addElement({ id: "survivor", x: 55, y: 66 });

      // Wait for save
      await expect
        .poll(
          async () => {
            const scene = await getPersistedScene("scene:current");
            return scene?.elements?.some((el) => el.id === "survivor") ?? false;
          },
          { timeout: 3000 },
        )
        .toBe(true);

      // Unmount and remount — set currentScreen to null so mountFresh doesn't double-unmount
      screen.unmount();
      currentScreen = null;
      await nextTick();
      await mountFresh();

      await expect
        .poll(() => API.elements.some((el) => el.id === "survivor"), { timeout: 3000 })
        .toBe(true);
    });

    it("preserves element properties through cycle", async () => {
      const screen = await mountFresh();

      API.addElement({ id: "round-trip", x: 100, y: 200, width: 300, height: 400 });

      await expect
        .poll(
          async () => {
            const scene = await getPersistedScene("scene:current");
            return scene?.elements?.some((el) => el.id === "round-trip") ?? false;
          },
          { timeout: 3000 },
        )
        .toBe(true);

      screen.unmount();
      currentScreen = null;
      await nextTick();
      await mountFresh();

      await expect
        .poll(() => API.elements.some((e) => e.id === "round-trip"), { timeout: 3000 })
        .toBe(true);

      const el = API.elements.find((e) => e.id === "round-trip")!;
      expect(el.x).toBe(100);
      expect(el.y).toBe(200);
    });
  });

  describe("fallback chain", () => {
    it("restores from scene:backup when current absent", async () => {
      const backupScene: PersistedScene = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        elements: [
          {
            id: "from-backup",
            type: "rectangle",
            x: 0,
            y: 0,
            width: 50,
            height: 50,
          } as PersistedScene["elements"][0],
        ],
        savedAt: Date.now(),
        elementCount: 1,
      };
      // Only set backup, not current
      await setPersistedScene("scene:backup", backupScene);

      await mountFresh();

      await expect
        .poll(() => API.elements.some((el) => el.id === "from-backup"), { timeout: 3000 })
        .toBe(true);
    });

    it("restores from localStorage emergency backup", async () => {
      // No IDB data, but localStorage has emergency backup
      const backup = {
        timestamp: Date.now(),
        elements: [{ id: "emergency-el", type: "rectangle", x: 0, y: 0, width: 50, height: 50 }],
      };
      localStorage.setItem(EMERGENCY_BACKUP_KEY, JSON.stringify(backup));

      await mountFresh();

      await expect
        .poll(() => API.elements.some((el) => el.id === "emergency-el"), { timeout: 3000 })
        .toBe(true);
    });
  });

  describe("forward version mode", () => {
    it("loads elements but prevents new saves when schema ahead", async () => {
      const futureVersion = CURRENT_SCHEMA_VERSION + 1;
      const futureScene = {
        schemaVersion: futureVersion,
        elements: [{ id: "future-el", type: "rectangle", x: 0, y: 0, width: 50, height: 50 }],
        savedAt: Date.now(),
        elementCount: 1,
      } as unknown as PersistedScene;
      await setPersistedScene("scene:current", futureScene);

      await mountFresh();

      // Wait for restore to load the future elements
      await expect
        .poll(() => API.elements.some((el) => el.id === "future-el"), { timeout: 3000 })
        .toBe(true);

      // Add a new element — it should not be saved since we're in forward version mode
      API.addElement({ id: "should-not-save" });

      // Wait enough time for the debounced save to fire if it were going to
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // The scene in IDB should still have the future schema version unchanged
      const scene = await getPersistedScene("scene:current");
      expect(scene?.schemaVersion).toBe(futureVersion);
      // The new element should not appear in the saved scene
      const savedIds = scene?.elements?.map((el) => el.id) ?? [];
      expect(savedIds).not.toContain("should-not-save");
    });
  });

  describe("error resilience", () => {
    it("starts with empty canvas on invalid IDB data", async () => {
      // Write garbage to scene:current
      await idbSet("scene:current", { garbage: true }, testSceneStore);

      await mountFresh();

      // Should gracefully fallback to empty
      expect(API.elements).toHaveLength(0);
    });
  });
}); // end describe("persistence")
