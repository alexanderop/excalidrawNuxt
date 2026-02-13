import { describe, it, expect } from "vitest";
import { withSetup } from "~/__test-utils__/withSetup";
import { createTestElement } from "~/__test-utils__/factories/element";
import { useClipboard } from "./useClipboard";

let counter = 0;

vi.mock("~/shared/random", () => ({
  generateId: vi.fn(() => `mock-${counter++}`),
  randomInteger: vi.fn(() => 999),
  randomVersionNonce: vi.fn(() => 888),
}));

function createCallbacks() {
  return {
    addElement: vi.fn(),
    select: vi.fn(),
    replaceSelection: vi.fn(),
    markStaticDirty: vi.fn(),
    markInteractiveDirty: vi.fn(),
    markDeleted: vi.fn(),
  };
}

describe("useClipboard", () => {
  // eslint-disable-next-line vitest/no-hooks -- reset global state between tests
  beforeEach(() => {
    counter = 0;
    const { clipboard } = withSetup(() => useClipboard());
    clipboard.value = [];
  });

  it("copy stores deep clones, not original references", () => {
    using ctx = withSetup(() => useClipboard());
    const original = createTestElement({ id: "a", x: 10 });
    ctx.copy([original]);

    expect(ctx.clipboard.value).toHaveLength(1);
    expect(ctx.clipboard.value[0]).not.toBe(original);
    expect(ctx.clipboard.value[0]!.x).toBe(10);
  });

  it("copy with empty array is a no-op", () => {
    using ctx = withSetup(() => useClipboard());
    const el = createTestElement({ id: "a" });
    ctx.copy([el]);
    ctx.copy([]);

    expect(ctx.clipboard.value).toHaveLength(1);
  });

  it("cut copies elements then calls markDeleted", () => {
    using ctx = withSetup(() => useClipboard());
    const el = createTestElement({ id: "a", x: 5 });
    const callbacks = createCallbacks();

    ctx.cut([el], callbacks);

    expect(ctx.clipboard.value).toHaveLength(1);
    expect(ctx.clipboard.value[0]!.x).toBe(5);
    expect(callbacks.markDeleted).toHaveBeenCalledWith([el]);
  });

  it("cut with empty array is a no-op", () => {
    using ctx = withSetup(() => useClipboard());
    const callbacks = createCallbacks();

    ctx.cut([], callbacks);

    expect(ctx.clipboard.value).toHaveLength(0);
    expect(callbacks.markDeleted).not.toHaveBeenCalled();
  });

  it("paste creates cloned elements with offset of 10", () => {
    using ctx = withSetup(() => useClipboard());
    const el = createTestElement({ id: "a", x: 50, y: 30 });
    ctx.copy([el]);

    const callbacks = createCallbacks();
    ctx.paste(callbacks);

    expect(callbacks.addElement).toHaveBeenCalledTimes(1);
    const added = callbacks.addElement.mock.calls[0]![0];
    expect(added.x).toBe(60);
    expect(added.y).toBe(40);
  });

  it("paste calls replaceSelection with new IDs", () => {
    using ctx = withSetup(() => useClipboard());
    ctx.copy([createTestElement({ id: "a" })]);

    const callbacks = createCallbacks();
    ctx.paste(callbacks);

    expect(callbacks.replaceSelection).toHaveBeenCalledTimes(1);
    const ids = callbacks.replaceSelection.mock.calls[0]![0] as Set<string>;
    expect(ids.size).toBe(1);
  });

  it("paste calls markStaticDirty and markInteractiveDirty", () => {
    using ctx = withSetup(() => useClipboard());
    ctx.copy([createTestElement({ id: "a" })]);

    const callbacks = createCallbacks();
    ctx.paste(callbacks);

    expect(callbacks.markStaticDirty).toHaveBeenCalledTimes(1);
    expect(callbacks.markInteractiveDirty).toHaveBeenCalledTimes(1);
  });

  it("paste with empty clipboard is a no-op", () => {
    using ctx = withSetup(() => useClipboard());
    const callbacks = createCallbacks();
    ctx.paste(callbacks);

    expect(callbacks.addElement).not.toHaveBeenCalled();
    expect(callbacks.replaceSelection).not.toHaveBeenCalled();
  });

  it("paste generates new IDs for cloned elements", () => {
    using ctx = withSetup(() => useClipboard());
    const el = createTestElement({ id: "original-id" });
    ctx.copy([el]);

    const callbacks = createCallbacks();
    ctx.paste(callbacks);

    const added = callbacks.addElement.mock.calls[0]![0];
    expect(added.id).not.toBe("original-id");
    expect(added.id).toMatch(/^mock-/);
  });

  it("copy then paste preserves element properties", () => {
    using ctx = withSetup(() => useClipboard());
    const el = createTestElement({
      id: "a",
      strokeColor: "#ff0000",
      backgroundColor: "#00ff00",
      strokeWidth: 4,
    });
    ctx.copy([el]);

    const callbacks = createCallbacks();
    ctx.paste(callbacks);

    const added = callbacks.addElement.mock.calls[0]![0];
    expect(added.strokeColor).toBe("#ff0000");
    expect(added.backgroundColor).toBe("#00ff00");
    expect(added.strokeWidth).toBe(4);
  });

  it("multiple paste operations produce unique IDs each time", () => {
    using ctx = withSetup(() => useClipboard());
    ctx.copy([createTestElement({ id: "a" })]);

    const callbacks1 = createCallbacks();
    ctx.paste(callbacks1);

    const callbacks2 = createCallbacks();
    ctx.paste(callbacks2);

    const id1 = callbacks1.addElement.mock.calls[0]![0].id;
    const id2 = callbacks2.addElement.mock.calls[0]![0].id;
    expect(id1).not.toBe(id2);
  });

  it("paste sets version to 0 on cloned elements", () => {
    using ctx = withSetup(() => useClipboard());
    ctx.copy([createTestElement({ id: "a", version: 42 })]);

    const callbacks = createCallbacks();
    ctx.paste(callbacks);

    const added = callbacks.addElement.mock.calls[0]![0];
    expect(added.version).toBe(0);
  });

  it("paste handles multiple elements", () => {
    using ctx = withSetup(() => useClipboard());
    ctx.copy([createTestElement({ id: "a", x: 10 }), createTestElement({ id: "b", x: 20 })]);

    const callbacks = createCallbacks();
    ctx.paste(callbacks);

    expect(callbacks.addElement).toHaveBeenCalledTimes(2);
    const ids = callbacks.replaceSelection.mock.calls[0]![0] as Set<string>;
    expect(ids.size).toBe(2);
  });
});
