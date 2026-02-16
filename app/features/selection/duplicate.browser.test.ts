import { TestDrawVue, waitForPaint } from "~/__test-utils__/browser";

describe("duplicate elements", () => {
  it("duplicates a single element via Ctrl+D", async () => {
    const td = await TestDrawVue.create();

    const ref = await td.createElement("rectangle", [3, 2], [6, 5]);
    td.expectSelected(ref.id);

    await td.keyboard.withModifierKeys({ ctrlKey: true }, async () => {
      await td.keyboard.press("d");
    });

    td.expectElementCount(2);
    const dup = td.elements[1]!;
    expect(dup.type).toBe("rectangle");
    expect(dup.id).not.toBe(ref.id);
  });

  it("duplicate preserves element properties", async () => {
    const td = await TestDrawVue.create();

    const ref = await td.createElement("rectangle", [3, 2], [6, 5]);
    const original = ref.get();

    await td.keyboard.withModifierKeys({ ctrlKey: true }, async () => {
      await td.keyboard.press("d");
    });

    const dup = td.elements[1]!;
    expect(dup.type).toBe(original.type);
    expect(dup.strokeColor).toBe(original.strokeColor);
    expect(dup.strokeWidth).toBe(original.strokeWidth);
    expect(dup.width).toBe(original.width);
    expect(dup.height).toBe(original.height);
  });

  it("duplicate offsets the new element from the original", async () => {
    const td = await TestDrawVue.create();

    const ref = await td.createElement("rectangle", [3, 2], [6, 5]);
    const original = ref.get();

    await td.keyboard.withModifierKeys({ ctrlKey: true }, async () => {
      await td.keyboard.press("d");
    });

    const dup = td.elements[1]!;
    expect(dup.x).not.toBe(original.x);
    expect(dup.y).not.toBe(original.y);
  });

  // eslint-disable-next-line vitest/expect-expect -- td.expectElementCount wraps expect()
  it("duplicates multiple selected elements", async () => {
    const td = await TestDrawVue.create();

    const r1 = await td.createElement("rectangle", [1, 1], [3, 3]);
    const r2 = await td.createElement("rectangle", [5, 1], [7, 3]);

    await td.selectElements(r1.get(), r2.get());
    td.expectSelected(r1.id, r2.id);

    await td.keyboard.withModifierKeys({ ctrlKey: true }, async () => {
      await td.keyboard.press("d");
    });

    td.expectElementCount(4);
  });

  it("duplicate selects the new elements", async () => {
    const td = await TestDrawVue.create();

    const ref = await td.createElement("rectangle", [3, 2], [6, 5]);
    const originalId = ref.id;

    await td.keyboard.withModifierKeys({ ctrlKey: true }, async () => {
      await td.keyboard.press("d");
    });

    const selectedIds = td.selectedIds;
    expect(selectedIds).not.toContain(originalId);
    expect(selectedIds).toHaveLength(1);
    expect(selectedIds[0]).toBe(td.elements[1]!.id);
  });

  // eslint-disable-next-line vitest/expect-expect -- td.expectElementCount wraps expect()
  it("undo removes the duplicate", async () => {
    const td = await TestDrawVue.create();

    await td.createElement("rectangle", [3, 2], [6, 5]);
    td.expectElementCount(1);

    await td.keyboard.withModifierKeys({ ctrlKey: true }, async () => {
      await td.keyboard.press("d");
    });
    td.expectElementCount(2);

    const undoBtn = td.screen.getByRole("button", { name: "Undo" });
    await undoBtn.click();
    await waitForPaint();

    td.expectElementCount(1);
  });
});
