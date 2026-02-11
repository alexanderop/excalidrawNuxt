import { isSeparator } from "./types";
import type { ContextMenuEntry } from "./types";

describe("isSeparator", () => {
  it("returns true for separator", () => {
    const entry: ContextMenuEntry = { type: "separator" };
    expect(isSeparator(entry)).toBe(true);
  });

  it("returns false for action", () => {
    const entry: ContextMenuEntry = { label: "Cut", action: () => {} };
    expect(isSeparator(entry)).toBe(false);
  });

  it("returns false for action with non-separator type field", () => {
    const entry = { label: "X", action: () => {}, type: "other" } as unknown as ContextMenuEntry;
    expect(isSeparator(entry)).toBe(false);
  });
});
