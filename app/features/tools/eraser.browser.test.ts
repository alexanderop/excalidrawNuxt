import { TestDrawVue } from "~/__test-utils__/browser";

describe("eraser tool", () => {
  it("erases an arrow when a single long eraser segment crosses through it", async () => {
    const td = await TestDrawVue.create();

    // Draw a diagonal arrow from top-left to bottom-right
    await td.createElementAtCells("arrow", [2, 2], [8, 8]);
    td.expectElementCount(1);
    const arrow = td.elements[0]!;
    expect(arrow.isDeleted).toBe(false);

    // Switch to eraser tool and drag perpendicularly through the arrow
    // with steps: 1, so only ONE long segment is tested.
    // The arrow runs from grid (2,2) to (8,8) — top-left to bottom-right.
    // The eraser goes from (2,8) to (8,2) — bottom-left to top-right.
    // These cross near the center, but with steps: 1 all four
    // endpoint-to-segment distances are large (~42px) while the
    // hit tolerance for a strokeWidth=2 arrow is only ~4px.
    // Without the segment-intersection check, this would MISS.
    td.setTool("eraser");
    await td.grid.drag([2, 8], [8, 2], { steps: 1 });

    const updated = td.getElement(arrow.id);
    expect(updated.isDeleted).toBe(true);
  });

  it("erases a rectangle when eraser drags across its edge", async () => {
    const td = await TestDrawVue.create();

    await td.createElementAtCells("rectangle", [3, 3], [7, 7]);
    td.expectElementCount(1);
    const rect = td.elements[0]!;

    td.setTool("eraser");
    await td.grid.drag([2, 5], [4, 5], { steps: 5 });

    const updated = td.getElement(rect.id);
    expect(updated.isDeleted).toBe(true);
  });

  it("does not erase elements when eraser misses", async () => {
    const td = await TestDrawVue.create();

    await td.createElementAtCells("rectangle", [1, 1], [3, 3]);
    td.expectElementCount(1);
    const rect = td.elements[0]!;

    td.setTool("eraser");
    await td.grid.drag([8, 8], [10, 10], { steps: 5 });

    const updated = td.getElement(rect.id);
    expect(updated.isDeleted).toBe(false);
  });

  it("erases an ellipse when eraser drags across its edge", async () => {
    const td = await TestDrawVue.create();

    await td.createElementAtCells("ellipse", [4, 3], [8, 6]);
    td.expectElementCount(1);
    const ellipse = td.elements[0]!;

    // Drag across the left edge of the ellipse (from outside to inside)
    td.setTool("eraser");
    await td.grid.drag([3, 4], [5, 5], { steps: 5 });

    const updated = td.getElement(ellipse.id);
    expect(updated.isDeleted).toBe(true);
  });

  it("erases a diamond when eraser drags across it", async () => {
    const td = await TestDrawVue.create();

    await td.createElementAtCells("diamond", [3, 2], [7, 6]);
    td.expectElementCount(1);
    const diamond = td.elements[0]!;

    td.setTool("eraser");
    await td.grid.drag([4, 3], [6, 5], { steps: 5 });

    const updated = td.getElement(diamond.id);
    expect(updated.isDeleted).toBe(true);
  });

  it("erases only the element touched, not nearby ones", async () => {
    const td = await TestDrawVue.create();

    // Two rectangles side by side with gap
    await td.createElementAtCells("rectangle", [1, 2], [3, 5]);
    await td.createElementAtCells("rectangle", [6, 2], [8, 5]);
    td.expectElementCount(2);
    const left = td.elements[0]!;
    const right = td.elements[1]!;

    // Erase across the left rectangle only
    td.setTool("eraser");
    await td.grid.drag([0, 3], [4, 3], { steps: 5 });

    expect(td.getElement(left.id).isDeleted).toBe(true);
    expect(td.getElement(right.id).isDeleted).toBe(false);
  });

  it("erases multiple elements in a single stroke", async () => {
    const td = await TestDrawVue.create();

    // Two rectangles in a horizontal line
    await td.createElementAtCells("rectangle", [2, 3], [4, 5]);
    await td.createElementAtCells("rectangle", [6, 3], [8, 5]);
    td.expectElementCount(2);
    const left = td.elements[0]!;
    const right = td.elements[1]!;

    // One long erase stroke across both
    td.setTool("eraser");
    await td.grid.drag([1, 4], [9, 4], { steps: 10 });

    expect(td.getElement(left.id).isDeleted).toBe(true);
    expect(td.getElement(right.id).isDeleted).toBe(true);
  });
});
