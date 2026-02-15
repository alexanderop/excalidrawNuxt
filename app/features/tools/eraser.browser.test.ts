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
});
