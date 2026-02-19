import { TestDrawVue, waitForPaint } from "~/__test-utils__/browser";

describe("multi-element transform + undo", () => {
  it("undo multi-element drag restores all 3 positions", async () => {
    const td = await TestDrawVue.create();

    const r1 = await td.createElement("rectangle", [2, 2], [4, 4]);
    const r2 = await td.createElement("rectangle", [6, 2], [8, 4]);
    const r3 = await td.createElement("rectangle", [10, 2], [12, 4]);

    await td.selectElements(r1.get(), r2.get(), r3.get());

    const x1 = td.getElement(r1.id).x;
    const y1 = td.getElement(r1.id).y;
    const x2 = td.getElement(r2.id).x;
    const y2 = td.getElement(r2.id).y;
    const x3 = td.getElement(r3.id).x;
    const y3 = td.getElement(r3.id).y;

    // Drag all three
    await td.drag([3, 3], [5, 5]);
    await waitForPaint();

    // Verify they moved
    expect(td.getElement(r1.id).x).not.toBeCloseTo(x1, 0);

    // Undo
    await td.undo();
    await waitForPaint();

    expect(td.getElement(r1.id).x).toBeCloseTo(x1, 0);
    expect(td.getElement(r1.id).y).toBeCloseTo(y1, 0);
    expect(td.getElement(r2.id).x).toBeCloseTo(x2, 0);
    expect(td.getElement(r2.id).y).toBeCloseTo(y2, 0);
    expect(td.getElement(r3.id).x).toBeCloseTo(x3, 0);
    expect(td.getElement(r3.id).y).toBeCloseTo(y3, 0);
  });

  it("redo after undo-drag restores moved positions", async () => {
    const td = await TestDrawVue.create();

    const r1 = await td.createElement("rectangle", [2, 2], [4, 4]);
    const r2 = await td.createElement("rectangle", [6, 2], [8, 4]);

    await td.selectElements(r1.get(), r2.get());

    // Drag
    await td.drag([3, 3], [5, 5]);
    await waitForPaint();

    const movedX1 = td.getElement(r1.id).x;
    const movedY1 = td.getElement(r1.id).y;
    const movedX2 = td.getElement(r2.id).x;
    const movedY2 = td.getElement(r2.id).y;

    // Undo then redo
    await td.undo();
    await waitForPaint();
    await td.redo();
    await waitForPaint();

    expect(td.getElement(r1.id).x).toBeCloseTo(movedX1, 0);
    expect(td.getElement(r1.id).y).toBeCloseTo(movedY1, 0);
    expect(td.getElement(r2.id).x).toBeCloseTo(movedX2, 0);
    expect(td.getElement(r2.id).y).toBeCloseTo(movedY2, 0);
  });

  it("sequential undo: delete then move", async () => {
    const td = await TestDrawVue.create();

    const r = await td.createElement("rectangle", [3, 3], [5, 5]);
    const origX = td.getElement(r.id).x;
    const origY = td.getElement(r.id).y;

    // Move it
    await td.drag([4, 4], [7, 7]);
    await waitForPaint();
    const movedX = td.getElement(r.id).x;
    const movedY = td.getElement(r.id).y;
    expect(movedX).not.toBeCloseTo(origX, 0);

    // Delete it
    await td.deleteSelected();
    await waitForPaint();
    const nonDeleted = td.elements.filter((e) => !e.isDeleted);
    expect(nonDeleted).toHaveLength(0);

    // Undo delete — restores at moved position
    await td.undo();
    await waitForPaint();
    expect(td.getElement(r.id).isDeleted).toBe(false);
    expect(td.getElement(r.id).x).toBeCloseTo(movedX, 0);
    expect(td.getElement(r.id).y).toBeCloseTo(movedY, 0);

    // Undo move — restores at original position
    await td.undo();
    await waitForPaint();
    expect(td.getElement(r.id).x).toBeCloseTo(origX, 0);
    expect(td.getElement(r.id).y).toBeCloseTo(origY, 0);
  });

  it("three sequential draws undone one by one", async () => {
    const td = await TestDrawVue.create();

    const r1 = await td.createElement("rectangle", [2, 2], [4, 4]);
    await td.createElement("ellipse", [6, 2], [8, 4]);
    await td.createElement("diamond", [10, 2], [12, 4]);

    expect(td.elements.filter((e) => !e.isDeleted)).toHaveLength(3);

    // Undo 3 times
    await td.undo();
    await waitForPaint();
    expect(td.elements.filter((e) => !e.isDeleted)).toHaveLength(2);

    await td.undo();
    await waitForPaint();
    expect(td.elements.filter((e) => !e.isDeleted)).toHaveLength(1);

    await td.undo();
    await waitForPaint();
    expect(td.elements.filter((e) => !e.isDeleted)).toHaveLength(0);

    // Redo 1x — first element returns
    await td.redo();
    await waitForPaint();
    const restored = td.elements.filter((e) => !e.isDeleted);
    expect(restored).toHaveLength(1);
    expect(restored[0]!.id).toBe(r1.id);
  });

  it("undo multi-element delete restores all elements", async () => {
    const td = await TestDrawVue.create();

    const r1 = await td.createElement("rectangle", [2, 2], [4, 4]);
    const r2 = await td.createElement("rectangle", [6, 2], [8, 4]);
    const r3 = await td.createElement("ellipse", [10, 2], [12, 4]);

    // Select all and delete
    await td.selectElements(r1.get(), r2.get(), r3.get());
    await td.deleteSelected();
    await waitForPaint();

    expect(td.elements.filter((e) => !e.isDeleted)).toHaveLength(0);

    // Undo — all 3 should be restored
    await td.undo();
    await waitForPaint();

    const nonDeleted = td.elements.filter((e) => !e.isDeleted);
    expect(nonDeleted).toHaveLength(3);
    expect(nonDeleted.some((e) => e.id === r1.id)).toBe(true);
    expect(nonDeleted.some((e) => e.id === r2.id)).toBe(true);
    expect(nonDeleted.some((e) => e.id === r3.id)).toBe(true);
  });

  it("drawing after undo clears redo stack", async () => {
    const td = await TestDrawVue.create();

    const r1 = await td.createElement("rectangle", [2, 2], [4, 4]);
    await td.createElement("rectangle", [6, 2], [8, 4]);

    expect(td.elements.filter((e) => !e.isDeleted)).toHaveLength(2);

    // Undo last draw
    await td.undo();
    await waitForPaint();
    expect(td.elements.filter((e) => !e.isDeleted)).toHaveLength(1);

    // Draw a new element — should clear redo stack
    const ellipse = await td.createElement("ellipse", [10, 2], [12, 4]);
    await waitForPaint();
    expect(td.elements.filter((e) => !e.isDeleted)).toHaveLength(2);

    // Redo should do nothing — redo stack was cleared
    await td.redo();
    await waitForPaint();

    const nonDeleted = td.elements.filter((e) => !e.isDeleted);
    expect(nonDeleted).toHaveLength(2);
    expect(nonDeleted.some((e) => e.id === r1.id)).toBe(true);
    expect(nonDeleted.some((e) => e.id === ellipse.id)).toBe(true);
  });

  it("selection state restored through undo/redo", async () => {
    const td = await TestDrawVue.create();

    const r1 = await td.createElement("rectangle", [2, 2], [4, 4]);
    // After creating r1, it should be selected
    expect(td.selectedIds).toContain(r1.id);

    const r2 = await td.createElement("rectangle", [6, 2], [8, 4]);
    // After creating r2, r2 should be selected
    expect(td.selectedIds).toContain(r2.id);

    // Undo r2 creation — r1 should be selected
    await td.undo();
    await waitForPaint();

    const afterUndo = td.elements.filter((e) => !e.isDeleted);
    expect(afterUndo).toHaveLength(1);
    expect(afterUndo[0]!.id).toBe(r1.id);

    // Redo — r2 returns and should be selected
    await td.redo();
    await waitForPaint();

    const afterRedo = td.elements.filter((e) => !e.isDeleted);
    expect(afterRedo).toHaveLength(2);
  });
});
