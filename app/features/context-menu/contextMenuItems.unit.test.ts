import { isSeparator, type ContextMenuItemDef } from "./types";
import { elementMenuItems, canvasMenuItems } from "./contextMenuItems";
import type { ActionId } from "~/shared/useActionRegistry";

function getActionIds(items: readonly ContextMenuItemDef[]): ActionId[] {
  return items
    .filter((item): item is { actionId: ActionId } => !isSeparator(item))
    .map((item) => item.actionId);
}

describe("elementMenuItems", () => {
  it("is a non-empty array", () => {
    expect(elementMenuItems.length).toBeGreaterThan(0);
  });

  it("contains clipboard action IDs", () => {
    const ids = getActionIds(elementMenuItems);
    expect(ids).toContain("clipboard:cut");
    expect(ids).toContain("clipboard:copy");
    expect(ids).toContain("clipboard:paste");
  });

  it("contains separator entries", () => {
    const separators = elementMenuItems.filter((item) => isSeparator(item));
    expect(separators.length).toBeGreaterThan(0);
  });

  it("contains delete action ID", () => {
    const ids = getActionIds(elementMenuItems);
    expect(ids).toContain("action:delete");
  });

  it("contains group and ungroup action IDs", () => {
    const ids = getActionIds(elementMenuItems);
    expect(ids).toContain("action:group");
    expect(ids).toContain("action:ungroup");
  });

  it("contains layer action IDs", () => {
    const ids = getActionIds(elementMenuItems);
    expect(ids).toContain("layer:bring-to-front");
    expect(ids).toContain("layer:bring-forward");
    expect(ids).toContain("layer:send-backward");
    expect(ids).toContain("layer:send-to-back");
  });

  it("contains style action IDs", () => {
    const ids = getActionIds(elementMenuItems);
    expect(ids).toContain("style:copy-styles");
    expect(ids).toContain("style:paste-styles");
  });

  it("contains flip action IDs", () => {
    const ids = getActionIds(elementMenuItems);
    expect(ids).toContain("flip:horizontal");
    expect(ids).toContain("flip:vertical");
  });
});

describe("canvasMenuItems", () => {
  it("is a non-empty array", () => {
    expect(canvasMenuItems.length).toBeGreaterThan(0);
  });

  it("contains paste and select-all action IDs", () => {
    const ids = getActionIds(canvasMenuItems);
    expect(ids).toContain("clipboard:paste");
    expect(ids).toContain("action:select-all");
  });
});
