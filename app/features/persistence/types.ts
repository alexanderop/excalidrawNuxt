import type { ExcalidrawElement, BinaryFiles } from "@drawvue/core";
import type { ComputedRef, InjectionKey, Ref, ShallowRef } from "vue";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const DB_NAME = "drawvue-scene-db";
export const STORE_NAME = "scene-store";
export const FILES_DB_NAME = "drawvue-files-db";
export const FILES_STORE_NAME = "files-store";
export const EMERGENCY_BACKUP_KEY = "drawvue-emergency-backup";
export const ELEMENT_COUNT_WARN_THRESHOLD = 3000;
export const CURRENT_SCHEMA_VERSION = 1 as const;

// ---------------------------------------------------------------------------
// Persisted scene — discriminated union by schemaVersion
// ---------------------------------------------------------------------------

export type PersistedSceneV1 = {
  schemaVersion: 1;
  elements: ExcalidrawElement[];
  savedAt: number;
  elementCount: number;
};

export type PersistedScene = PersistedSceneV1;

export type CurrentPersistedScene = PersistedSceneV1;

// ---------------------------------------------------------------------------
// Migration map — compiler-enforced entry for every version except current
// ---------------------------------------------------------------------------

export type MigrationMap = {
  [V in PersistedScene["schemaVersion"] as V extends typeof CURRENT_SCHEMA_VERSION ? never : V]: (
    data: Extract<PersistedScene, { schemaVersion: V }>,
  ) => CurrentPersistedScene;
};

// ---------------------------------------------------------------------------
// Store key schemas
// ---------------------------------------------------------------------------

export type SceneStoreSchema = {
  "scene:current": PersistedScene;
  "scene:backup": PersistedScene;
};

export type FilesStoreSchema = {
  "files:current": BinaryFiles;
};

// ---------------------------------------------------------------------------
// Emergency backup (localStorage)
// ---------------------------------------------------------------------------

export type EmergencyBackup = {
  timestamp: number;
  elements: ExcalidrawElement[];
};

// ---------------------------------------------------------------------------
// Save status state machine
// ---------------------------------------------------------------------------

export type SaveStatus = "idle" | "pending" | "saving" | "unavailable" | "error";

// ---------------------------------------------------------------------------
// Persistence event log
// ---------------------------------------------------------------------------

export type PersistenceEventType =
  | "save"
  | "save-skip"
  | "backup"
  | "debounce"
  | "change"
  | "restore"
  | "probe"
  | "error"
  | "clear"
  | "export";

export type PersistenceEvent = {
  id: number;
  type: PersistenceEventType;
  timestamp: number;
  message: string;
};

// ---------------------------------------------------------------------------
// Store metadata (for inspector display)
// ---------------------------------------------------------------------------

export type StoreMetadata = {
  current: {
    schemaVersion: number;
    elementCount: number;
    savedAt: number;
    dataSize: number;
  } | null;
  backup: {
    schemaVersion: number;
    elementCount: number;
    savedAt: number;
    deltaVsCurrent: number;
  } | null;
  emergency: {
    timestamp: number;
    elementCount: number;
    dataSize: number;
  } | null;
};

// ---------------------------------------------------------------------------
// Diagnostics (exposed from usePersistence for inspector)
// ---------------------------------------------------------------------------

export type PersistenceDiagnostics = {
  lastSavedHash: Readonly<Ref<number>>;
  sceneHash: Readonly<ComputedRef<number>>;
  forwardVersionMode: Readonly<Ref<boolean>>;
  hasPersistedStorage: Readonly<Ref<boolean>>;
  events: Readonly<ShallowRef<readonly PersistenceEvent[]>>;
  flushSave: () => void;
  clearStorage: () => Promise<void>;
  readStoreMetadata: () => Promise<StoreMetadata>;
};

// ---------------------------------------------------------------------------
// Inspector context (provided by PersistenceProvider)
// ---------------------------------------------------------------------------

export type PersistenceInspectorContext = {
  saveStatus: Readonly<Ref<SaveStatus>>;
  isRestored: Readonly<Ref<boolean>>;
  error: Readonly<ShallowRef<Error | null>>;
  diagnostics: PersistenceDiagnostics;
};

export const PERSISTENCE_INSPECTOR_KEY: InjectionKey<PersistenceInspectorContext> =
  Symbol("persistence-inspector");

// ---------------------------------------------------------------------------
// Composable return type
// ---------------------------------------------------------------------------

export type UsePersistenceReturn = {
  isRestored: Readonly<Ref<boolean>>;
  saveStatus: Readonly<Ref<SaveStatus>>;
  error: Readonly<ShallowRef<Error | null>>;
  diagnostics: PersistenceDiagnostics;
};
