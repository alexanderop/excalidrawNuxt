import { isSeparator } from "./types";
import type { ContextMenuAction, ContextMenuContext } from "./types";

vi.mock("~/features/properties/composables/useStyleClipboard", () => ({
  useStyleClipboard: () => ({
    copyStyles: vi.fn(),
    pasteStyles: vi.fn(),
    hasStoredStyles: { value: false },
  }),
}));

const { elementMenuItems, canvasMenuItems } = await import("./contextMenuItems");

describe("elementMenuItems", () => {
  it("is a non-empty array", () => {
    expect(elementMenuItems.length).toBeGreaterThan(0);
  });

  it("contains Cut, Copy, and Paste actions", () => {
    const labels = elementMenuItems
      .filter((item): item is ContextMenuAction => !isSeparator(item))
      .map((item) => item.label);

    expect(labels).toContain("Cut");
    expect(labels).toContain("Copy");
    expect(labels).toContain("Paste");
  });

  it("contains separator entries", () => {
    const separators = elementMenuItems.filter((item) => isSeparator(item));
    expect(separators.length).toBeGreaterThan(0);
  });

  it("contains Delete action", () => {
    const labels = elementMenuItems
      .filter((item): item is ContextMenuAction => !isSeparator(item))
      .map((item) => item.label);

    expect(labels).toContain("Delete");
  });

  it("contains Group and Ungroup actions", () => {
    const labels = elementMenuItems
      .filter((item): item is ContextMenuAction => !isSeparator(item))
      .map((item) => item.label);

    expect(labels).toContain("Group");
    expect(labels).toContain("Ungroup");
  });

  it("Ungroup predicate returns true when context.hasGroups is true", () => {
    const ungroupItem = elementMenuItems.find(
      (item): item is ContextMenuAction => !isSeparator(item) && item.label === "Ungroup",
    );

    expect(ungroupItem).toBeDefined();
    expect(ungroupItem!.predicate).toBeDefined();

    const ctx: ContextMenuContext = {
      selectedIds: new Set(),
      selectedElements: [],
      hasGroups: true,
      isMultiSelect: false,
      markDirty: vi.fn(),
    };

    expect(ungroupItem!.predicate!(ctx)).toBe(true);
  });
});

describe("canvasMenuItems", () => {
  it("is a non-empty array", () => {
    expect(canvasMenuItems.length).toBeGreaterThan(0);
  });

  it("contains Paste and Select all", () => {
    const labels = canvasMenuItems
      .filter((item): item is ContextMenuAction => !isSeparator(item))
      .map((item) => item.label);

    expect(labels).toContain("Paste");
    expect(labels).toContain("Select all");
  });
});
