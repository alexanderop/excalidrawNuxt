import { isSeparator, type ContextMenuItemDef } from "./types";

describe("isSeparator", () => {
  it("returns true for separator", () => {
    const entry: ContextMenuItemDef = { type: "separator" };
    expect(isSeparator(entry)).toBe(true);
  });

  it("returns false for action ID entry", () => {
    const entry: ContextMenuItemDef = { actionId: "action:delete" };
    expect(isSeparator(entry)).toBe(false);
  });
});
