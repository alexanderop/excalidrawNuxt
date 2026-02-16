import { isQuotaExceeded, isIDBUnavailable, probeIndexedDB } from "./stores";

// ---------------------------------------------------------------------------
// Minimal typed mock helpers for IDB probe tests
// ---------------------------------------------------------------------------

type IDBEventHandler = (event: string, handler: () => void) => void;

function createMockIDBRequest(outcome: "success" | "error"): {
  request: IDBOpenDBRequest;
  db: IDBDatabase;
} {
  const db = { close: vi.fn() } as unknown as IDBDatabase;
  const listeners = new Map<string, () => void>();

  const request = {
    addEventListener: vi.fn(((event: string, handler: () => void) => {
      listeners.set(event, handler);
      if (event === outcome) {
        if (outcome === "success") {
          Object.defineProperty(request, "result", { value: db, configurable: true });
        }
        if (outcome === "error") {
          Object.defineProperty(request, "error", {
            value: new Error("probe failed"),
            configurable: true,
          });
        }
        handler();
      }
    }) as IDBEventHandler),
    result: db,
    error: null,
  } as unknown as IDBOpenDBRequest;

  return { request, db };
}

function stubIndexedDB(request: IDBOpenDBRequest): IDBFactory {
  const mockIDB = {
    open: vi.fn(() => request),
    deleteDatabase: vi.fn(),
  } as unknown as IDBFactory;
  vi.stubGlobal("indexedDB", mockIDB);
  return mockIDB;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("isQuotaExceeded", () => {
  it("returns true for QuotaExceededError", () => {
    const error = new DOMException("quota exceeded", "QuotaExceededError");
    expect(isQuotaExceeded(error)).toBe(true);
  });

  it("returns false for other errors", () => {
    expect(isQuotaExceeded(new Error("something else"))).toBe(false);
    expect(isQuotaExceeded(new TypeError("type error"))).toBe(false);
  });
});

describe("isIDBUnavailable", () => {
  it("returns true for SecurityError", () => {
    const error = new DOMException("blocked", "SecurityError");
    expect(isIDBUnavailable(error)).toBe(true);
  });

  it("returns true for InvalidStateError", () => {
    const error = new DOMException("invalid", "InvalidStateError");
    expect(isIDBUnavailable(error)).toBe(true);
  });

  it("returns true when message contains 'indexedDB'", () => {
    const error = new Error("indexedDB is not available");
    expect(isIDBUnavailable(error)).toBe(true);
  });

  it("returns false for unrelated errors", () => {
    expect(isIDBUnavailable(new Error("network failed"))).toBe(false);
    expect(isIDBUnavailable(new TypeError("null reference"))).toBe(false);
  });
});

describe("probeIndexedDB", () => {
  // eslint-disable-next-line vitest/no-hooks -- global stubs need cleanup
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns false when indexedDB is undefined", async () => {
    vi.stubGlobal("indexedDB", undefined);

    const result = await probeIndexedDB();
    expect(result).toBe(false);
  });

  it("returns true when probe succeeds", async () => {
    const { request, db } = createMockIDBRequest("success");
    const mockIDB = stubIndexedDB(request);

    const result = await probeIndexedDB();
    expect(result).toBe(true);
    expect(db.close).toHaveBeenCalled();
    expect(mockIDB.deleteDatabase).toHaveBeenCalledWith("__drawvue_probe");
  });

  it("returns false when probe fires error", async () => {
    const { request } = createMockIDBRequest("error");
    stubIndexedDB(request);

    const result = await probeIndexedDB();
    expect(result).toBe(false);
  });
});
