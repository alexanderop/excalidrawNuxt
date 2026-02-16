import type { ExcalidrawElement, Result } from "@drawvue/core";
import { getNonDeletedElements, hashElementsVersion, tryCatchSync } from "@drawvue/core";
import { getScene, setScene, isQuotaExceeded } from "./stores";
import type {
  CurrentPersistedScene,
  EmergencyBackup,
  PersistedScene,
  SceneStoreSchema,
  StoreMetadata,
} from "./types";
import {
  CURRENT_SCHEMA_VERSION,
  EMERGENCY_BACKUP_KEY,
  ELEMENT_COUNT_WARN_THRESHOLD,
} from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// ---------------------------------------------------------------------------
// Migrations — compiler-enforced via MigrationMap
// ---------------------------------------------------------------------------

export function migrateScene(stored: PersistedScene): CurrentPersistedScene {
  if (stored.schemaVersion === CURRENT_SCHEMA_VERSION) {
    return stored;
  }

  // Dead code today — MigrationMap is empty. When V2 is added,
  // TypeScript will force adding a case here.
  throw new Error(`No migration for schema version ${stored.schemaVersion}`);
}

// ---------------------------------------------------------------------------
// Validation — manual type guards, normalize-on-read
// ---------------------------------------------------------------------------

export function isValidPersistedScene(data: unknown): data is PersistedScene {
  if (!isRecord(data)) return false;
  if (typeof data.schemaVersion !== "number") return false;
  if (!Array.isArray(data.elements)) return false;
  if (typeof data.savedAt !== "number") return false;
  return true;
}

export function normalizeElements(elements: readonly unknown[]): ExcalidrawElement[] {
  return elements.filter((el): el is ExcalidrawElement => {
    if (!isRecord(el)) return false;

    if (typeof el.id !== "string" || el.id.length === 0) {
      console.warn("[persistence] Skipping element with missing/invalid id");
      return false;
    }

    if (typeof el.type !== "string" || el.type.length === 0) {
      console.warn("[persistence] Skipping element with missing/invalid type:", el.id);
      return false;
    }

    return true;
  });
}

// ---------------------------------------------------------------------------
// Serialization — JSON round-trip to strip non-serializable customData
// ---------------------------------------------------------------------------

export function serializeElements(
  elements: readonly ExcalidrawElement[],
): Result<ExcalidrawElement[]> {
  const nonDeleted = [...getNonDeletedElements(elements)];

  if (nonDeleted.length > ELEMENT_COUNT_WARN_THRESHOLD) {
    console.warn(
      `[persistence] Element count (${nonDeleted.length}) exceeds threshold (${ELEMENT_COUNT_WARN_THRESHOLD}). Consider per-element storage for better performance.`,
    );
  }

  return tryCatchSync(() => {
    const json = JSON.stringify(nonDeleted);
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed)) throw new Error("Serialization produced non-array");
    return parsed as ExcalidrawElement[];
  });
}

// ---------------------------------------------------------------------------
// Save — rolling backup + write current
// ---------------------------------------------------------------------------

type SaveSceneResult = {
  success: boolean;
  hash: number;
  quotaExceeded: boolean;
};

export async function saveScene(elements: readonly ExcalidrawElement[]): Promise<SaveSceneResult> {
  const [serializeError, serialized] = serializeElements(elements);

  if (serializeError) {
    console.error("[persistence] Serialization failed:", serializeError.message);
    return { success: false, hash: 0, quotaExceeded: false };
  }

  const hash = hashElementsVersion(serialized);

  const scene: CurrentPersistedScene = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    elements: serialized,
    savedAt: Date.now(),
    elementCount: serialized.length,
  };

  // Rolling backup: copy current to backup before overwriting
  const [currentError, current] = await getScene("scene:current");
  if (currentError === null && current !== undefined) {
    const [backupError] = await setScene("scene:backup", current);
    if (backupError) {
      console.warn("[persistence] Failed to write rolling backup:", backupError.message);
    }
  }

  // Write current scene
  const [writeError] = await setScene("scene:current", scene);

  if (writeError) {
    const exceeded = isQuotaExceeded(writeError);
    console.error(
      `[persistence] Save failed${exceeded ? " (quota exceeded)" : ""}:`,
      writeError.message,
    );
    return { success: false, hash, quotaExceeded: exceeded };
  }

  return { success: true, hash, quotaExceeded: false };
}

// ---------------------------------------------------------------------------
// Load — fallback chain: IndexedDB current → backup → localStorage → empty
// ---------------------------------------------------------------------------

type LoadSceneResult = {
  elements: ExcalidrawElement[];
  source: "indexeddb" | "backup" | "localstorage" | "empty";
  forwardVersion: boolean;
};

function restorePersistedScene(
  data: PersistedScene,
  source: LoadSceneResult["source"],
): LoadSceneResult {
  if (data.schemaVersion > CURRENT_SCHEMA_VERSION) {
    console.warn(
      `[persistence] Data has newer schema version (${data.schemaVersion} > ${CURRENT_SCHEMA_VERSION}). Please refresh this tab.`,
    );
    return { elements: normalizeElements(data.elements), source, forwardVersion: true };
  }

  const migrated = migrateScene(data);
  return { elements: normalizeElements(migrated.elements), source, forwardVersion: false };
}

async function loadFromIDB(
  key: keyof SceneStoreSchema,
  source: LoadSceneResult["source"],
): Promise<LoadSceneResult | null> {
  const [error, data] = await getScene(key);

  if (error) {
    console.warn(`[persistence] Failed to read ${key}:`, error.message);
    return null;
  }

  if (data === undefined) {
    return null;
  }

  if (!isValidPersistedScene(data)) {
    console.warn(`[persistence] Invalid scene data in ${key}`);
    return null;
  }

  return restorePersistedScene(data, source);
}

function loadFromLocalStorage(): LoadSceneResult | null {
  const [lsError, lsResult] = tryCatchSync(() => {
    const raw = localStorage.getItem(EMERGENCY_BACKUP_KEY);
    if (raw === null) {
      return null;
    }
    return JSON.parse(raw) as unknown;
  });

  if (lsError) {
    console.warn("[persistence] Failed to read emergency backup:", lsError.message);
    return null;
  }

  if (lsResult === null) {
    return null;
  }

  if (!isRecord(lsResult)) {
    console.warn("[persistence] Invalid emergency backup in localStorage");
    return null;
  }
  if (!Array.isArray(lsResult.elements) || typeof lsResult.timestamp !== "number") {
    console.warn("[persistence] Invalid emergency backup in localStorage");
    return null;
  }

  console.warn("[persistence] Restored from localStorage emergency backup");
  return {
    elements: normalizeElements(lsResult.elements as unknown[]),
    source: "localstorage",
    forwardVersion: false,
  };
}

export async function loadScene(): Promise<LoadSceneResult> {
  const fromCurrent = await loadFromIDB("scene:current", "indexeddb");
  if (fromCurrent) {
    return fromCurrent;
  }

  const fromBackup = await loadFromIDB("scene:backup", "backup");
  if (fromBackup) {
    console.warn("[persistence] Restored from backup");
    return fromBackup;
  }

  const fromLS = loadFromLocalStorage();
  if (fromLS) {
    return fromLS;
  }

  return { elements: [], source: "empty", forwardVersion: false };
}

// ---------------------------------------------------------------------------
// Emergency sync save to localStorage
// ---------------------------------------------------------------------------

export function emergencySaveToLocalStorage(elements: readonly ExcalidrawElement[]): void {
  const nonDeleted = [...getNonDeletedElements(elements)];
  const backup: EmergencyBackup = {
    timestamp: Date.now(),
    elements: nonDeleted,
  };

  const [error] = tryCatchSync(() =>
    localStorage.setItem(EMERGENCY_BACKUP_KEY, JSON.stringify(backup)),
  );

  if (error) {
    // localStorage quota exceeded — silently ignore, IndexedDB is the real safety net
    console.warn("[persistence] Emergency backup to localStorage failed:", error.message);
  }
}

// ---------------------------------------------------------------------------
// Read store metadata (for dev inspector)
// ---------------------------------------------------------------------------

async function readSceneMetadata(
  key: keyof SceneStoreSchema,
): Promise<StoreMetadata["current"] | null> {
  const [err, data] = await getScene(key);
  if (err !== null || data === undefined || !isValidPersistedScene(data)) return null;
  return {
    schemaVersion: data.schemaVersion,
    elementCount: data.elementCount,
    savedAt: data.savedAt,
    dataSize: new Blob([JSON.stringify(data)]).size,
  };
}

function readEmergencyMetadata(): StoreMetadata["emergency"] | null {
  const [lsErr, lsRaw] = tryCatchSync(() => localStorage.getItem(EMERGENCY_BACKUP_KEY));
  if (lsErr !== null || lsRaw === null) return null;

  const [parseErr, parsed] = tryCatchSync(() => JSON.parse(lsRaw) as unknown);
  if (parseErr !== null || !isRecord(parsed)) return null;
  if (typeof parsed.timestamp !== "number" || !Array.isArray(parsed.elements)) return null;

  return {
    timestamp: parsed.timestamp,
    elementCount: (parsed.elements as unknown[]).length,
    dataSize: new Blob([lsRaw]).size,
  };
}

export async function readStoreMetadata(): Promise<StoreMetadata> {
  const current = await readSceneMetadata("scene:current");
  const backupBase = await readSceneMetadata("scene:backup");

  const backup: StoreMetadata["backup"] = backupBase
    ? {
        schemaVersion: backupBase.schemaVersion,
        elementCount: backupBase.elementCount,
        savedAt: backupBase.savedAt,
        deltaVsCurrent: current ? backupBase.elementCount - current.elementCount : 0,
      }
    : null;

  return { current, backup, emergency: readEmergencyMetadata() };
}
