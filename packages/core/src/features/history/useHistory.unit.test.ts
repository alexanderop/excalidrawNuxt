import { shallowRef } from "vue";
import { withSetup } from "../../__test-utils__/withSetup";
import { createTestElement } from "../../__test-utils__/factories/element";
import { mutateElement } from "../elements/mutateElement";
import { useHistory } from "./useHistory";
import type { ExcalidrawElement } from "../elements/types";
import type { DirtyFlags } from "../canvas/composables/createDirtyFlags";

function createDeps() {
  const elements = shallowRef<readonly ExcalidrawElement[]>([]);
  const selectedIds = shallowRef<ReadonlySet<string>>(new Set());

  const dirty: DirtyFlags = {
    markStaticDirty: () => {},
    markInteractiveDirty: () => {},
    markNewElementDirty: () => {},
    bind: () => {},
  };

  function replaceElements(els: readonly ExcalidrawElement[]): void {
    elements.value = els;
  }

  function replaceSelection(ids: Set<string>): void {
    selectedIds.value = ids;
  }

  return {
    elements,
    replaceElements,
    selectedIds,
    replaceSelection,
    dirty,
  };
}

describe("useHistory", () => {
  it("starts with canUndo=false and canRedo=false", () => {
    const deps = createDeps();
    using h = withSetup(() => useHistory(deps));
    expect(h.canUndo.value).toBe(false);
    expect(h.canRedo.value).toBe(false);
  });

  it("recordAction creates undo entry when state changes", () => {
    const deps = createDeps();
    const el = createTestElement({ id: "a" });
    deps.elements.value = [el];

    using h = withSetup(() => useHistory(deps));

    h.recordAction(() => {
      mutateElement(el, { x: 50 });
    });

    expect(h.canUndo.value).toBe(true);
    expect(h.canRedo.value).toBe(false);
  });

  it("recordAction skips no-op when nothing changed", () => {
    const deps = createDeps();
    deps.elements.value = [createTestElement({ id: "a" })];

    using h = withSetup(() => useHistory(deps));

    h.recordAction(() => {
      // No mutation
    });

    expect(h.canUndo.value).toBe(false);
  });

  it("recordAction clears redo stack", () => {
    const deps = createDeps();
    const el = createTestElement({ id: "a", x: 0 });
    deps.elements.value = [el];

    using h = withSetup(() => useHistory(deps));

    // First action
    h.recordAction(() => {
      mutateElement(el, { x: 10 });
    });
    // Undo to create redo
    h.undo();
    expect(h.canRedo.value).toBe(true);

    // New action clears redo — use current element ref (undo replaced elements)
    h.recordAction(() => {
      mutateElement(deps.elements.value[0]!, { x: 20 });
    });
    expect(h.canRedo.value).toBe(false);
  });

  it("undo restores previous element state", () => {
    const deps = createDeps();
    const el = createTestElement({ id: "a", x: 0 });
    deps.elements.value = [el];

    using h = withSetup(() => useHistory(deps));

    h.recordAction(() => {
      mutateElement(el, { x: 100 });
    });

    h.undo();

    expect(deps.elements.value[0]!.x).toBe(0);
  });

  it("redo restores undone state", () => {
    const deps = createDeps();
    const el = createTestElement({ id: "a", x: 0 });
    deps.elements.value = [el];

    using h = withSetup(() => useHistory(deps));

    h.recordAction(() => {
      mutateElement(el, { x: 100 });
    });

    h.undo();
    expect(deps.elements.value[0]!.x).toBe(0);

    h.redo();
    expect(deps.elements.value[0]!.x).toBe(100);
  });

  it("undo restores selection state", () => {
    const deps = createDeps();
    const el = createTestElement({ id: "a" });
    deps.elements.value = [el];
    deps.selectedIds.value = new Set(["a"]);

    using h = withSetup(() => useHistory(deps));

    h.recordAction(() => {
      mutateElement(el, { isDeleted: true });
      deps.selectedIds.value = new Set();
    });

    expect(deps.selectedIds.value.size).toBe(0);

    h.undo();
    expect(deps.selectedIds.value.has("a")).toBe(true);
  });

  it("multiple undo/redo cycles work correctly", () => {
    const deps = createDeps();
    const el = createTestElement({ id: "a", x: 0 });
    deps.elements.value = [el];

    using h = withSetup(() => useHistory(deps));

    h.recordAction(() => mutateElement(el, { x: 10 }));
    h.recordAction(() => mutateElement(el, { x: 20 }));
    h.recordAction(() => mutateElement(el, { x: 30 }));

    h.undo();
    expect(deps.elements.value[0]!.x).toBe(20);

    h.undo();
    expect(deps.elements.value[0]!.x).toBe(10);

    h.redo();
    expect(deps.elements.value[0]!.x).toBe(20);

    h.redo();
    expect(deps.elements.value[0]!.x).toBe(30);
  });

  it("saveCheckpoint + commitCheckpoint creates entry", () => {
    const deps = createDeps();
    const el = createTestElement({ id: "a", x: 0 });
    deps.elements.value = [el];

    using h = withSetup(() => useHistory(deps));

    h.saveCheckpoint();
    mutateElement(el, { x: 50 });
    h.commitCheckpoint();

    expect(h.canUndo.value).toBe(true);

    h.undo();
    expect(deps.elements.value[0]!.x).toBe(0);
  });

  it("discardCheckpoint restores state", () => {
    const deps = createDeps();
    const el = createTestElement({ id: "a", x: 0 });
    deps.elements.value = [el];

    using h = withSetup(() => useHistory(deps));

    h.saveCheckpoint();
    mutateElement(el, { x: 50 });
    h.discardCheckpoint();

    expect(deps.elements.value[0]!.x).toBe(0);
    expect(h.canUndo.value).toBe(false);
  });

  it("commitCheckpoint skips when no changes", () => {
    const deps = createDeps();
    deps.elements.value = [createTestElement({ id: "a" })];

    using h = withSetup(() => useHistory(deps));

    h.saveCheckpoint();
    // No mutation
    h.commitCheckpoint();

    expect(h.canUndo.value).toBe(false);
  });

  it("undo during active checkpoint auto-commits", () => {
    const deps = createDeps();
    const el = createTestElement({ id: "a", x: 0 });
    deps.elements.value = [el];

    using h = withSetup(() => useHistory(deps));

    h.saveCheckpoint();
    mutateElement(el, { x: 50 });

    // Undo should auto-commit the pending checkpoint, then undo it
    h.undo();

    expect(deps.elements.value[0]!.x).toBe(0);
    expect(h.canRedo.value).toBe(true);
  });

  it("redo is blocked during active checkpoint", () => {
    const deps = createDeps();
    const el = createTestElement({ id: "a", x: 0 });
    deps.elements.value = [el];

    using h = withSetup(() => useHistory(deps));

    h.recordAction(() => mutateElement(el, { x: 10 }));
    h.undo();

    // Start a new checkpoint
    h.saveCheckpoint();
    // Redo should be blocked
    h.redo();
    // State should still be x=0 (redo was blocked)
    expect(deps.elements.value[0]!.x).toBe(0);
  });

  it("capacity limit drops oldest entry", () => {
    const deps = createDeps();
    const el = createTestElement({ id: "a", x: 0 });
    deps.elements.value = [el];

    using h = withSetup(() => useHistory(deps));

    // Create 101 entries
    for (let i = 1; i <= 101; i++) {
      h.recordAction(() => mutateElement(el, { x: i }));
    }

    // Should have max 100 undo entries
    let undoCount = 0;
    while (h.canUndo.value) {
      h.undo();
      undoCount++;
    }

    expect(undoCount).toBe(100);
  });

  it("snapshots are isolated — mutation after snapshot does not corrupt history", () => {
    const deps = createDeps();
    const el = createTestElement({ id: "a", x: 0 });
    deps.elements.value = [el];

    using h = withSetup(() => useHistory(deps));

    h.recordAction(() => mutateElement(el, { x: 10 }));

    // Mutate element directly (simulating ongoing interaction)
    mutateElement(el, { x: 999 });

    // Undo should restore to x=0 (before the first recordAction), not x=999
    h.undo();
    expect(deps.elements.value[0]!.x).toBe(0);
  });

  it("undo triggers canvas re-render via dirty flags", () => {
    const staticDirtyCalls: number[] = [];
    const interactiveDirtyCalls: number[] = [];
    const deps = createDeps();
    deps.dirty = {
      markStaticDirty: () => staticDirtyCalls.push(1),
      markInteractiveDirty: () => interactiveDirtyCalls.push(1),
      markNewElementDirty: () => {},
      bind: () => {},
    };
    const el = createTestElement({ id: "a", x: 0 });
    deps.elements.value = [el];

    using h = withSetup(() => useHistory(deps));

    h.recordAction(() => mutateElement(el, { x: 10 }));

    staticDirtyCalls.length = 0;
    interactiveDirtyCalls.length = 0;

    h.undo();

    expect(staticDirtyCalls.length).toBeGreaterThan(0);
    expect(interactiveDirtyCalls.length).toBeGreaterThan(0);
  });

  it("undo on empty stack is a no-op", () => {
    const deps = createDeps();
    deps.elements.value = [createTestElement({ id: "a", x: 0 })];

    using h = withSetup(() => useHistory(deps));

    h.undo();

    expect(deps.elements.value[0]!.x).toBe(0);
    expect(h.canUndo.value).toBe(false);
    expect(h.canRedo.value).toBe(false);
  });

  it("redo on empty stack is a no-op", () => {
    const deps = createDeps();
    deps.elements.value = [createTestElement({ id: "a", x: 0 })];

    using h = withSetup(() => useHistory(deps));

    h.redo();

    expect(deps.elements.value[0]!.x).toBe(0);
    expect(h.canUndo.value).toBe(false);
    expect(h.canRedo.value).toBe(false);
  });

  it("double saveCheckpoint ignores second call and preserves first", () => {
    const deps = createDeps();
    const el = createTestElement({ id: "a", x: 0 });
    deps.elements.value = [el];

    using h = withSetup(() => useHistory(deps));

    h.saveCheckpoint();
    mutateElement(el, { x: 50 });
    h.saveCheckpoint(); // Should be ignored
    mutateElement(el, { x: 100 });
    h.commitCheckpoint();

    h.undo();
    // Should restore to x=0 (first checkpoint), not x=50
    expect(deps.elements.value[0]!.x).toBe(0);
  });

  it("commitCheckpoint without saveCheckpoint is a no-op", () => {
    const deps = createDeps();
    deps.elements.value = [createTestElement({ id: "a", x: 0 })];

    using h = withSetup(() => useHistory(deps));

    h.commitCheckpoint();

    expect(h.canUndo.value).toBe(false);
  });

  it("discardCheckpoint without saveCheckpoint is a no-op", () => {
    const deps = createDeps();
    const el = createTestElement({ id: "a", x: 42 });
    deps.elements.value = [el];

    using h = withSetup(() => useHistory(deps));

    h.discardCheckpoint();

    expect(deps.elements.value[0]!.x).toBe(42);
    expect(h.canUndo.value).toBe(false);
  });

  it("undo restores after element addition", () => {
    const deps = createDeps();
    const el = createTestElement({ id: "a", x: 0 });
    deps.elements.value = [el];

    using h = withSetup(() => useHistory(deps));

    h.recordAction(() => {
      const newEl = createTestElement({ id: "b", x: 200 });
      deps.elements.value = [...deps.elements.value, newEl];
    });

    expect(deps.elements.value).toHaveLength(2);

    h.undo();

    expect(deps.elements.value).toHaveLength(1);
    expect(deps.elements.value[0]!.id).toBe("a");
  });

  it("undo restores after element removal", () => {
    const deps = createDeps();
    const elA = createTestElement({ id: "a", x: 0 });
    const elB = createTestElement({ id: "b", x: 100 });
    deps.elements.value = [elA, elB];

    using h = withSetup(() => useHistory(deps));

    h.recordAction(() => {
      deps.elements.value = [elA];
    });

    expect(deps.elements.value).toHaveLength(1);

    h.undo();

    expect(deps.elements.value).toHaveLength(2);
    expect(deps.elements.value[1]!.id).toBe("b");
  });

  it("multi-element scenario — undo only affects changed element", () => {
    const deps = createDeps();
    const elA = createTestElement({ id: "a", x: 0 });
    const elB = createTestElement({ id: "b", x: 50 });
    const elC = createTestElement({ id: "c", x: 100 });
    deps.elements.value = [elA, elB, elC];

    using h = withSetup(() => useHistory(deps));

    h.recordAction(() => {
      mutateElement(elB, { x: 999 });
    });

    h.undo();

    expect(deps.elements.value[0]!.x).toBe(0);
    expect(deps.elements.value[1]!.x).toBe(50);
    expect(deps.elements.value[2]!.x).toBe(100);
  });
});
