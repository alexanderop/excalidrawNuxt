import { createStore, get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";
import type { FileId, Result } from "@drawvue/core";
import { tryCatch } from "@drawvue/core";
import { DB_NAME, STORE_NAME, FILES_DB_NAME, FILES_STORE_NAME } from "./types";
import type { SceneStoreSchema } from "./types";

// ---------------------------------------------------------------------------
// Store instances
// ---------------------------------------------------------------------------

export const sceneStore = createStore(DB_NAME, STORE_NAME);
export const filesStore = createStore(FILES_DB_NAME, FILES_STORE_NAME);

// ---------------------------------------------------------------------------
// Typed scene store wrappers
// ---------------------------------------------------------------------------

export function getScene<K extends keyof SceneStoreSchema & string>(
  key: K,
): Promise<Result<SceneStoreSchema[K] | undefined>> {
  return tryCatch(idbGet<SceneStoreSchema[K]>(key, sceneStore));
}

export function setScene<K extends keyof SceneStoreSchema & string>(
  key: K,
  value: SceneStoreSchema[K],
): Promise<Result<void>> {
  return tryCatch(idbSet(key, value, sceneStore));
}

export function delScene<K extends keyof SceneStoreSchema & string>(key: K): Promise<Result<void>> {
  return tryCatch(idbDel(key, sceneStore));
}

// ---------------------------------------------------------------------------
// Typed file store wrappers (Phase 2)
// ---------------------------------------------------------------------------

export function getFile(id: FileId): Promise<Result<Blob | undefined>> {
  return tryCatch(idbGet<Blob>(id, filesStore));
}

export function setFile(id: FileId, blob: Blob): Promise<Result<void>> {
  return tryCatch(idbSet(id, blob, filesStore));
}

// ---------------------------------------------------------------------------
// Error predicates
// ---------------------------------------------------------------------------

export function isQuotaExceeded(error: Error): boolean {
  return error.name === "QuotaExceededError";
}

export function isIDBUnavailable(error: Error): boolean {
  return (
    error.name === "SecurityError" ||
    error.name === "InvalidStateError" ||
    error.message.includes("indexedDB")
  );
}

// ---------------------------------------------------------------------------
// IndexedDB availability probe
// ---------------------------------------------------------------------------

export async function probeIndexedDB(): Promise<boolean> {
  if (typeof indexedDB === "undefined") {
    return false;
  }

  const [error] = await tryCatch(
    new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("__drawvue_probe");
      request.addEventListener("error", () =>
        reject(request.error ?? new Error("IndexedDB probe failed")),
      );
      request.addEventListener("success", () => {
        request.result.close();
        indexedDB.deleteDatabase("__drawvue_probe");
        resolve();
      });
    }),
  );

  return error === null;
}
