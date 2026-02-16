import { TestDrawVue, waitForPaint } from "~/__test-utils__/browser";

describe("element drag and move", () => {
  it("moves element to new position when dragged", async () => {
    const td = await TestDrawVue.create();

    const r = await td.createElement("rectangle", [2, 2], [4, 4]);
    const before = td.getElement(r.id);
    const xBefore = before.x;
    const yBefore = before.y;

    // Drag from center of the element area to a new position
    await td.drag([3, 3], [6, 6]);
    await waitForPaint();

    const after = td.getElement(r.id);
    expect(after.x).not.toBe(xBefore);
    expect(after.y).not.toBe(yBefore);
    expect(after.x).toBeGreaterThan(xBefore);
    expect(after.y).toBeGreaterThan(yBefore);
  });

  it("moves all selected elements when dragging one of them", async () => {
    const td = await TestDrawVue.create();

    const r1 = await td.createElement("rectangle", [2, 2], [4, 4]);
    const r2 = await td.createElement("rectangle", [6, 2], [8, 4]);

    await td.selectElements(r1.get(), r2.get());

    const x1Before = td.getElement(r1.id).x;
    const y1Before = td.getElement(r1.id).y;
    const x2Before = td.getElement(r2.id).x;
    const y2Before = td.getElement(r2.id).y;

    // Drag from r1's area — both should move
    await td.drag([3, 3], [5, 5]);
    await waitForPaint();

    const dx1 = td.getElement(r1.id).x - x1Before;
    const dy1 = td.getElement(r1.id).y - y1Before;
    const dx2 = td.getElement(r2.id).x - x2Before;
    const dy2 = td.getElement(r2.id).y - y2Before;

    expect(dx1).not.toBe(0);
    expect(dy1).not.toBe(0);
    expect(dx1).toBeCloseTo(dx2, 0);
    expect(dy1).toBeCloseTo(dy2, 0);
  });

  it("nudges element by 1px with arrow keys", async () => {
    const td = await TestDrawVue.create();

    const r = await td.createElement("rectangle", [4, 4], [6, 6]);
    const xBefore = td.getElement(r.id).x;
    const yBefore = td.getElement(r.id).y;

    await td.keyPress("{ArrowRight}");
    await waitForPaint();

    expect(td.getElement(r.id).x).toBeCloseTo(xBefore + 1, 0);
    expect(td.getElement(r.id).y).toBeCloseTo(yBefore, 0);
  });

  it("nudges element by 10px with shift+arrow keys", async () => {
    const td = await TestDrawVue.create();

    const r = await td.createElement("rectangle", [4, 4], [6, 6]);
    const xBefore = td.getElement(r.id).x;

    await td.keyboard.withModifierKeys({ shiftKey: true }, async () => {
      await td.keyPress("{ArrowRight}");
    });
    await waitForPaint();

    expect(td.getElement(r.id).x).toBeCloseTo(xBefore + 10, 0);
  });

  it("drag is undoable with Ctrl+Z", async () => {
    const td = await TestDrawVue.create();

    const r = await td.createElement("rectangle", [3, 3], [5, 5]);
    const xBefore = td.getElement(r.id).x;
    const yBefore = td.getElement(r.id).y;

    await td.drag([4, 4], [7, 7]);
    await waitForPaint();

    // Verify element moved
    expect(td.getElement(r.id).x).not.toBe(xBefore);

    // Undo
    await td.undo();
    await waitForPaint();

    expect(td.getElement(r.id).x).toBeCloseTo(xBefore, 0);
    expect(td.getElement(r.id).y).toBeCloseTo(yBefore, 0);
  });
});
