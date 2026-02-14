import { CanvasPage, API, waitForPaint } from "~/__test-utils__/browser";

describe("visual rendering", () => {
  it("renders all element types using grid coordinates", async () => {
    const page = await CanvasPage.create();

    // Row 1: Rectangle at cells [1,1]→[4,3]
    await page.canvas.createElementAtCells("rectangle", [1, 1], [4, 3]);

    // Row 1: Diamond at cells [5,1]→[8,3]
    await page.canvas.createElementAtCells("diamond", [5, 1], [8, 3]);

    // Row 2: Ellipse at cells [1,4]→[4,6]
    await page.canvas.createElementAtCells("ellipse", [1, 4], [4, 6]);

    // Row 2: Arrow at cells [5,5]→[8,5]
    await page.canvas.createElementAtCells("arrow", [5, 5], [8, 5]);

    await waitForPaint();

    expect(API.elements).toHaveLength(4);
    expect(API.elements.map((e) => e.type)).toEqual(["rectangle", "diamond", "ellipse", "arrow"]);
  });
});
