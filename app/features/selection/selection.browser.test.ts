/* eslint-disable vitest/expect-expect -- assertSelectedElements wraps expect() */
import { CanvasPage } from "~/__test-utils__/browser";
import { waitForPaint } from "~/__test-utils__/browser/waiters";

describe("selection", () => {
  it("selects element by clicking on it", async () => {
    const page = await CanvasPage.create();

    const rect = await page.canvas.createElement("rectangle", [2, 2], [5, 5]);
    page.selection.clear();
    await waitForPaint();

    await page.canvas.clickCenter([2, 2], [5, 5]);

    page.selection.expectSelected(rect.id);
  });

  it("adds to selection with shift-click", async () => {
    const page = await CanvasPage.create();

    const r1 = await page.canvas.createElement("rectangle", [1, 1], [3, 3]);
    const r2 = await page.canvas.createElement("ellipse", [5, 1], [7, 3]);
    page.selection.clear();
    await waitForPaint();

    // Click first element
    await page.canvas.clickCenter([1, 1], [3, 3]);
    page.selection.expectSelected(r1.id);

    // Shift-click second element
    await page.canvas.clickCenter([5, 1], [7, 3], { shiftKey: true });
    page.selection.expectSelected(r1.id, r2.id);
  });

  it("box-selects multiple elements", async () => {
    const page = await CanvasPage.create();

    const r1 = await page.canvas.createElement("rectangle", [1, 1], [3, 3]);
    const r2 = await page.canvas.createElement("ellipse", [5, 1], [7, 3]);
    page.selection.clear();
    await waitForPaint();

    // Drag selection box from empty space around both
    await page.selection.boxSelect([0, 0], [8, 4]);
    await waitForPaint();

    page.selection.expectSelected(r1.id, r2.id);
  });

  it("deselects on empty canvas click", async () => {
    const page = await CanvasPage.create();

    await page.canvas.createElement("rectangle", [2, 2], [4, 4]);

    // Click on empty space far from the rectangle
    await page.canvas.click([10, 8]);

    page.selection.expectNoneSelected();
  });

  it("clearSelection empties selection", async () => {
    const page = await CanvasPage.create();

    await page.canvas.createElement("rectangle", [2, 2], [5, 5]);

    page.selection.clear();
    page.selection.expectNoneSelected();
  });

  it("programmatic setSelectedElements works", async () => {
    const page = await CanvasPage.create();

    const r1 = page.scene.addElement({ x: 50, y: 50, width: 60, height: 60 });
    const r2 = page.scene.addElement({ x: 200, y: 50, width: 60, height: 60 });
    await page.scene.flush();

    page.selection.setSelected(r1, r2);
    page.selection.expectSelected(r1.id, r2.id);

    page.selection.setSelected(r2);
    page.selection.expectSelected(r2.id);
  });
});
