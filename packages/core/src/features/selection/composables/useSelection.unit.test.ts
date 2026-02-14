import { describe, it, expect } from "vitest";
import { shallowRef } from "vue";
import { createTestElement } from "../../../__test-utils__/factories/element";
import { withSetup } from "../../../__test-utils__/withSetup";
import { useSelection } from "./useSelection";

describe("useSelection", () => {
  it("starts with empty selection", () => {
    using sel = withSetup(() => useSelection(shallowRef([])));
    expect(sel.selectedIds.value.size).toBe(0);
    expect(sel.selectedElements.value).toEqual([]);
  });

  it("select() replaces selection with single element", () => {
    const elements = shallowRef([createTestElement({ id: "a" }), createTestElement({ id: "b" })]);
    using sel = withSetup(() => useSelection(elements));
    sel.select("a");
    expect(sel.selectedIds.value.has("a")).toBe(true);
    expect(sel.selectedIds.value.size).toBe(1);
  });

  it("addToSelection() adds without replacing", () => {
    const elements = shallowRef([createTestElement({ id: "a" }), createTestElement({ id: "b" })]);
    using sel = withSetup(() => useSelection(elements));
    sel.select("a");
    sel.addToSelection("b");
    expect(sel.selectedIds.value.size).toBe(2);
    expect(sel.isSelected("a")).toBe(true);
    expect(sel.isSelected("b")).toBe(true);
  });

  it("toggleSelection() adds on first call, removes on second", () => {
    const elements = shallowRef([createTestElement({ id: "a" })]);
    using sel = withSetup(() => useSelection(elements));
    sel.toggleSelection("a");
    expect(sel.isSelected("a")).toBe(true);
    sel.toggleSelection("a");
    expect(sel.isSelected("a")).toBe(false);
  });

  it("clearSelection() empties selection", () => {
    const elements = shallowRef([createTestElement({ id: "a" })]);
    using sel = withSetup(() => useSelection(elements));
    sel.select("a");
    sel.clearSelection();
    expect(sel.selectedIds.value.size).toBe(0);
  });

  it("selectedElements excludes deleted", () => {
    const elements = shallowRef([
      createTestElement({ id: "a", isDeleted: false }),
      createTestElement({ id: "b", isDeleted: true }),
    ]);
    using sel = withSetup(() => useSelection(elements));
    sel.select("a");
    sel.addToSelection("b");
    expect(sel.selectedElements.value.map((e) => e.id)).toEqual(["a"]);
  });

  it("selectionBounds computes common bounding box", () => {
    const elements = shallowRef([
      createTestElement({ id: "a", x: 0, y: 0, width: 50, height: 50 }),
      createTestElement({ id: "b", x: 100, y: 100, width: 50, height: 50 }),
    ]);
    using sel = withSetup(() => useSelection(elements));
    sel.select("a");
    sel.addToSelection("b");
    expect(sel.selectionBounds.value).toEqual([0, 0, 150, 150]);
  });

  it("selectionBounds is null when nothing selected", () => {
    const elements = shallowRef([createTestElement({ id: "a" })]);
    using sel = withSetup(() => useSelection(elements));
    expect(sel.selectionBounds.value).toBeNull();
  });

  it("selectAll() selects all non-deleted elements", () => {
    const elements = shallowRef([
      createTestElement({ id: "a", isDeleted: false }),
      createTestElement({ id: "b", isDeleted: false }),
      createTestElement({ id: "c", isDeleted: true }),
    ]);
    using sel = withSetup(() => useSelection(elements));
    sel.selectAll();
    expect(sel.selectedIds.value.size).toBe(2);
    expect(sel.isSelected("a")).toBe(true);
    expect(sel.isSelected("b")).toBe(true);
    expect(sel.isSelected("c")).toBe(false);
  });
});
