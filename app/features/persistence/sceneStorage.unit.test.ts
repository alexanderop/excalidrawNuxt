import type { ExcalidrawElement, Result } from "@drawvue/core";
import { createTestElement } from "@drawvue/core/test-utils";
import {
  isValidPersistedScene,
  normalizeElements,
  serializeElements,
  migrateScene,
  saveScene,
  loadScene,
  emergencySaveToLocalStorage,
  readStoreMetadata,
} from "./sceneStorage";
import {
  CURRENT_SCHEMA_VERSION,
  EMERGENCY_BACKUP_KEY,
  ELEMENT_COUNT_WARN_THRESHOLD,
} from "./types";
import type { PersistedScene, CurrentPersistedScene } from "./types";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("./stores", () => ({
  getScene: vi.fn(),
  setScene: vi.fn(),
  isQuotaExceeded: vi.fn((error: Error) => error.name === "QuotaExceededError"),
}));

type MockFn = ReturnType<typeof vi.fn>;
const { getScene, setScene } = (await import("./stores")) as unknown as {
  getScene: MockFn;
  setScene: MockFn;
};

describe("sceneStorage", () => {
  // eslint-disable-next-line vitest/no-hooks -- clearing mocks is necessary for isolated tests
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // isValidPersistedScene
  // ---------------------------------------------------------------------------

  describe("isValidPersistedScene", () => {
    it("returns true for valid scene with all required fields", () => {
      const scene: PersistedScene = {
        schemaVersion: 1,
        elements: [],
        savedAt: Date.now(),
        elementCount: 0,
      };
      expect(isValidPersistedScene(scene)).toBe(true);
    });

    it("returns false for null", () => {
      expect(isValidPersistedScene(null)).toBe(false);
    });

    it("returns false for non-objects and primitives", () => {
      expect(isValidPersistedScene(undefined)).toBe(false);
      expect(isValidPersistedScene(42)).toBe(false);
      expect(isValidPersistedScene("string")).toBe(false);
      expect(isValidPersistedScene(true)).toBe(false);
    });

    it("returns false for missing schemaVersion", () => {
      expect(isValidPersistedScene({ elements: [], savedAt: 1 })).toBe(false);
    });

    it("returns false for wrong-type schemaVersion", () => {
      expect(isValidPersistedScene({ schemaVersion: "1", elements: [], savedAt: 1 })).toBe(false);
    });

    it("returns false for missing elements", () => {
      expect(isValidPersistedScene({ schemaVersion: 1, savedAt: 1 })).toBe(false);
    });

    it("returns false for wrong-type elements", () => {
      expect(isValidPersistedScene({ schemaVersion: 1, elements: "not-array", savedAt: 1 })).toBe(
        false,
      );
    });

    it("returns false for missing savedAt", () => {
      expect(isValidPersistedScene({ schemaVersion: 1, elements: [] })).toBe(false);
    });

    it("returns false for wrong-type savedAt", () => {
      expect(isValidPersistedScene({ schemaVersion: 1, elements: [], savedAt: "now" })).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // normalizeElements
  // ---------------------------------------------------------------------------

  describe("normalizeElements", () => {
    it("passes through valid elements", () => {
      const el = createTestElement({ id: "a" });
      const result = normalizeElements([el]);
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe("a");
    });

    it("filters out null and non-object entries", () => {
      const el = createTestElement({ id: "valid" });
      const result = normalizeElements([null, undefined, 42, "str", el]);
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe("valid");
    });

    it("filters out elements with missing or empty id", () => {
      const noId = { type: "rectangle" };
      const emptyId = { id: "", type: "rectangle" };
      const valid = createTestElement({ id: "ok" });
      const result = normalizeElements([noId, emptyId, valid]);
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe("ok");
    });

    it("filters out elements with missing or empty type", () => {
      const noType = { id: "a" };
      const emptyType = { id: "b", type: "" };
      const valid = createTestElement({ id: "c" });
      const result = normalizeElements([noType, emptyType, valid]);
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe("c");
    });

    it("preserves valid elements in mixed array", () => {
      const a = createTestElement({ id: "a" });
      const b = createTestElement({ id: "b" });
      const result = normalizeElements([null, a, { id: "" }, b, 123]);
      expect(result).toHaveLength(2);
      expect(result.map((e) => e.id)).toEqual(["a", "b"]);
    });
  });

  // ---------------------------------------------------------------------------
  // serializeElements
  // ---------------------------------------------------------------------------

  describe("serializeElements", () => {
    it("serializes non-deleted elements via JSON round-trip", () => {
      const el = createTestElement({ id: "a", isDeleted: false });
      const [error, result] = serializeElements([el]);
      expect(error).toBeNull();
      expect(result).toHaveLength(1);
      expect(result![0]!.id).toBe("a");
    });

    it("filters deleted elements", () => {
      const alive = createTestElement({ id: "alive", isDeleted: false });
      const deleted = createTestElement({ id: "dead", isDeleted: true });
      const [error, result] = serializeElements([alive, deleted]);
      expect(error).toBeNull();
      expect(result).toHaveLength(1);
      expect(result![0]!.id).toBe("alive");
    });

    it("returns error tuple on non-serializable customData", () => {
      const circular = {} as Record<string, unknown>;
      circular.self = circular;
      const el = createTestElement({ id: "bad", customData: circular });
      const [error, result] = serializeElements([el]);
      expect(error).toBeInstanceOf(Error);
      expect(result).toBeNull();
    });

    it("warns when element count exceeds threshold", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      // Create elements exceeding threshold (all non-deleted)
      const elements: ExcalidrawElement[] = Array.from(
        { length: ELEMENT_COUNT_WARN_THRESHOLD + 1 },
        (_, i) => createTestElement({ id: `el-${i}` }),
      );

      serializeElements(elements);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Element count"));

      warnSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------------------
  // migrateScene
  // ---------------------------------------------------------------------------

  describe("migrateScene", () => {
    it("returns scene unchanged when at current version", () => {
      const scene: CurrentPersistedScene = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        elements: [],
        savedAt: 1000,
        elementCount: 0,
      };
      const result = migrateScene(scene);
      expect(result).toBe(scene);
    });
  });

  // ---------------------------------------------------------------------------
  // saveScene
  // ---------------------------------------------------------------------------

  describe("saveScene", () => {
    it("writes to scene:current with correct schema", async () => {
      getScene.mockResolvedValue([null, undefined] as Result<undefined>);
      setScene.mockResolvedValue([null, undefined] as Result<void>);

      const el = createTestElement({ id: "a" });
      const result = await saveScene([el]);

      expect(result.success).toBe(true);
      expect(result.hash).toBeGreaterThan(0);
      expect(result.quotaExceeded).toBe(false);
      expect(setScene).toHaveBeenCalledWith(
        "scene:current",
        expect.objectContaining({
          schemaVersion: CURRENT_SCHEMA_VERSION,
          elements: expect.arrayContaining([expect.objectContaining({ id: "a" })]),
        }),
      );
    });

    it("creates rolling backup before writing", async () => {
      const existingScene: PersistedScene = {
        schemaVersion: 1,
        elements: [],
        savedAt: 500,
        elementCount: 0,
      };
      getScene.mockResolvedValue([null, existingScene] as Result<PersistedScene>);
      setScene.mockResolvedValue([null, undefined] as Result<void>);

      await saveScene([createTestElement({ id: "b" })]);

      // First setScene call should be the backup
      expect(setScene).toHaveBeenCalledWith("scene:backup", existingScene);
      // Second call writes scene:current
      expect(setScene).toHaveBeenCalledWith(
        "scene:current",
        expect.objectContaining({ schemaVersion: 1 }),
      );
      expect(setScene).toHaveBeenCalledTimes(2);
    });

    it("skips backup when scene:current does not exist", async () => {
      getScene.mockResolvedValue([null, undefined] as Result<undefined>);
      setScene.mockResolvedValue([null, undefined] as Result<void>);

      await saveScene([createTestElement()]);

      // Only one setScene call (scene:current), no backup
      expect(setScene).toHaveBeenCalledTimes(1);
      expect(setScene).toHaveBeenCalledWith("scene:current", expect.anything());
    });

    it("returns quotaExceeded:true on QuotaExceededError", async () => {
      getScene.mockResolvedValue([null, undefined] as Result<undefined>);
      const quotaError = new DOMException("quota exceeded", "QuotaExceededError");
      setScene.mockResolvedValue([quotaError, null] as Result<void>);

      const result = await saveScene([createTestElement()]);

      expect(result.success).toBe(false);
      expect(result.quotaExceeded).toBe(true);
    });

    it("returns success:false for non-quota errors", async () => {
      getScene.mockResolvedValue([null, undefined] as Result<undefined>);
      setScene.mockResolvedValue([new Error("disk error"), null] as Result<void>);

      const result = await saveScene([createTestElement()]);

      expect(result.success).toBe(false);
      expect(result.quotaExceeded).toBe(false);
    });

    it("returns success:false when serialization fails", async () => {
      const circular = {} as Record<string, unknown>;
      circular.self = circular;
      const el = createTestElement({ customData: circular });

      const result = await saveScene([el]);

      expect(result.success).toBe(false);
      expect(result.hash).toBe(0);
      // No IDB calls should happen when serialization fails
      expect(setScene).not.toHaveBeenCalled();
    });

    it("continues writing even when backup write fails", async () => {
      const existingScene: PersistedScene = {
        schemaVersion: 1,
        elements: [],
        savedAt: 500,
        elementCount: 0,
      };
      getScene.mockResolvedValue([null, existingScene] as Result<PersistedScene>);
      // First setScene (backup) fails, second (current) succeeds
      setScene
        .mockResolvedValueOnce([new Error("backup write failed"), null] as Result<void>)
        .mockResolvedValueOnce([null, undefined] as Result<void>);

      const result = await saveScene([createTestElement()]);

      expect(result.success).toBe(true);
      expect(setScene).toHaveBeenCalledTimes(2);
    });
  });

  // ---------------------------------------------------------------------------
  // loadScene
  // ---------------------------------------------------------------------------

  describe("loadScene", () => {
    it("loads from scene:current when valid", async () => {
      const el = createTestElement({ id: "loaded" });
      const scene: PersistedScene = {
        schemaVersion: 1,
        elements: [el],
        savedAt: 1000,
        elementCount: 1,
      };
      getScene.mockResolvedValueOnce([null, scene] as Result<PersistedScene>);

      const result = await loadScene();

      expect(result.source).toBe("indexeddb");
      expect(result.elements).toHaveLength(1);
      expect(result.elements[0]!.id).toBe("loaded");
      expect(result.forwardVersion).toBe(false);
    });

    it("falls back to scene:backup when current is missing", async () => {
      const el = createTestElement({ id: "from-backup" });
      const backupScene: PersistedScene = {
        schemaVersion: 1,
        elements: [el],
        savedAt: 900,
        elementCount: 1,
      };
      // scene:current returns undefined
      getScene.mockResolvedValueOnce([null, undefined] as Result<undefined>);
      // scene:backup returns data
      getScene.mockResolvedValueOnce([null, backupScene] as Result<PersistedScene>);

      const result = await loadScene();

      expect(result.source).toBe("backup");
      expect(result.elements[0]!.id).toBe("from-backup");
    });

    it("falls back to scene:backup when current has error", async () => {
      const el = createTestElement({ id: "backup-el" });
      const backupScene: PersistedScene = {
        schemaVersion: 1,
        elements: [el],
        savedAt: 900,
        elementCount: 1,
      };
      // scene:current returns error
      getScene.mockResolvedValueOnce([new Error("IDB read error"), null] as Result<undefined>);
      // scene:backup returns data
      getScene.mockResolvedValueOnce([null, backupScene] as Result<PersistedScene>);

      const result = await loadScene();

      expect(result.source).toBe("backup");
      expect(result.elements[0]!.id).toBe("backup-el");
    });

    it("falls back to localStorage emergency backup", async () => {
      // Both IDB reads fail
      getScene.mockResolvedValueOnce([null, undefined] as Result<undefined>);
      getScene.mockResolvedValueOnce([null, undefined] as Result<undefined>);

      const el = createTestElement({ id: "emergency" });
      const backup = JSON.stringify({ timestamp: Date.now(), elements: [el] });
      vi.stubGlobal("localStorage", {
        getItem: vi.fn(() => backup),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      });

      const result = await loadScene();

      expect(result.source).toBe("localstorage");
      expect(result.elements[0]!.id).toBe("emergency");

      vi.unstubAllGlobals();
    });

    it("returns empty scene when all fallbacks fail", async () => {
      getScene.mockResolvedValueOnce([null, undefined] as Result<undefined>);
      getScene.mockResolvedValueOnce([null, undefined] as Result<undefined>);

      vi.stubGlobal("localStorage", {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      });

      const result = await loadScene();

      expect(result.source).toBe("empty");
      expect(result.elements).toEqual([]);
      expect(result.forwardVersion).toBe(false);

      vi.unstubAllGlobals();
    });

    it("normalizes elements on load", async () => {
      const scene: PersistedScene = {
        schemaVersion: 1,
        elements: [
          createTestElement({ id: "valid" }),
          null as unknown as ExcalidrawElement,
          { id: "", type: "rect" } as unknown as ExcalidrawElement,
        ],
        savedAt: 1000,
        elementCount: 3,
      };
      getScene.mockResolvedValueOnce([null, scene] as Result<PersistedScene>);

      const result = await loadScene();

      expect(result.elements).toHaveLength(1);
      expect(result.elements[0]!.id).toBe("valid");
    });

    it("sets forwardVersion:true when schema is ahead", async () => {
      const futureScene = {
        schemaVersion: CURRENT_SCHEMA_VERSION + 1,
        elements: [createTestElement({ id: "future" })],
        savedAt: 2000,
        elementCount: 1,
      };
      getScene.mockResolvedValueOnce([null, futureScene] as Result<PersistedScene>);

      const result = await loadScene();

      expect(result.forwardVersion).toBe(true);
      expect(result.elements).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // emergencySaveToLocalStorage
  // ---------------------------------------------------------------------------

  describe("emergencySaveToLocalStorage", () => {
    it("saves non-deleted elements under emergency key", () => {
      const setItemMock = vi.fn();
      vi.stubGlobal("localStorage", {
        getItem: vi.fn(),
        setItem: setItemMock,
        removeItem: vi.fn(),
      });

      const alive = createTestElement({ id: "alive", isDeleted: false });
      const deleted = createTestElement({ id: "dead", isDeleted: true });
      emergencySaveToLocalStorage([alive, deleted]);

      expect(setItemMock).toHaveBeenCalledWith(
        EMERGENCY_BACKUP_KEY,
        expect.stringContaining("alive"),
      );
      const saved = JSON.parse(setItemMock.mock.calls[0]![1] as string) as {
        elements: ExcalidrawElement[];
      };
      expect(saved.elements).toHaveLength(1);
      expect(saved.elements[0]!.id).toBe("alive");

      vi.unstubAllGlobals();
    });

    it("silently handles localStorage quota exceeded", () => {
      vi.stubGlobal("localStorage", {
        getItem: vi.fn(),
        setItem: vi.fn(() => {
          throw new DOMException("quota exceeded", "QuotaExceededError");
        }),
        removeItem: vi.fn(),
      });

      // Should not throw
      expect(() => emergencySaveToLocalStorage([createTestElement()])).not.toThrow();

      vi.unstubAllGlobals();
    });
  });

  // ---------------------------------------------------------------------------
  // readStoreMetadata
  // ---------------------------------------------------------------------------

  describe("readStoreMetadata", () => {
    it("returns null entries when no data exists", async () => {
      getScene.mockResolvedValue([null, undefined] as Result<undefined>);

      vi.stubGlobal("localStorage", {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      });

      const result = await readStoreMetadata();

      expect(result.current).toBeNull();
      expect(result.backup).toBeNull();
      expect(result.emergency).toBeNull();

      vi.unstubAllGlobals();
    });

    it("returns populated metadata when data exists", async () => {
      const currentScene: PersistedScene = {
        schemaVersion: 1,
        elements: [createTestElement({ id: "a" }), createTestElement({ id: "b" })],
        savedAt: 1_700_000_000_000,
        elementCount: 2,
      };
      const backupScene: PersistedScene = {
        schemaVersion: 1,
        elements: [createTestElement({ id: "a" })],
        savedAt: 1_699_999_990_000,
        elementCount: 1,
      };

      getScene
        .mockResolvedValueOnce([null, currentScene] as Result<PersistedScene>)
        .mockResolvedValueOnce([null, backupScene] as Result<PersistedScene>);

      vi.stubGlobal("localStorage", {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      });

      const result = await readStoreMetadata();

      expect(result.current).not.toBeNull();
      expect(result.current!.schemaVersion).toBe(1);
      expect(result.current!.elementCount).toBe(2);
      expect(result.current!.savedAt).toBe(1_700_000_000_000);
      expect(result.current!.dataSize).toBeGreaterThan(0);

      expect(result.backup).not.toBeNull();
      expect(result.backup!.elementCount).toBe(1);
      expect(result.backup!.deltaVsCurrent).toBe(-1);

      vi.unstubAllGlobals();
    });

    it("reads emergency backup from localStorage", async () => {
      getScene.mockResolvedValue([null, undefined] as Result<undefined>);

      const emergencyData = JSON.stringify({
        timestamp: 1_700_000_005_000,
        elements: [createTestElement({ id: "emergency" })],
      });

      vi.stubGlobal("localStorage", {
        getItem: vi.fn(() => emergencyData),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      });

      const result = await readStoreMetadata();

      expect(result.emergency).not.toBeNull();
      expect(result.emergency!.timestamp).toBe(1_700_000_005_000);
      expect(result.emergency!.elementCount).toBe(1);
      expect(result.emergency!.dataSize).toBeGreaterThan(0);

      vi.unstubAllGlobals();
    });
  });
}); // end describe("sceneStorage")
