/* eslint-disable vitest/expect-expect -- page object methods wrap expect() */
import { CanvasPage } from "~/__test-utils__/browser";
import { waitForPaint } from "~/__test-utils__/browser/waiters";

function visibleElements(page: CanvasPage): readonly { type: string }[] {
  return page.scene.elements.filter((el) => !el.isDeleted);
}

async function clickUndo(page: CanvasPage): Promise<void> {
  const btn = page.screen.getByRole("button", { name: "Undo" });
  await btn.click();
  await waitForPaint();
}

async function clickRedo(page: CanvasPage): Promise<void> {
  const btn = page.screen.getByRole("button", { name: "Redo" });
  await btn.click();
  await waitForPaint();
}

describe("history (undo/redo)", () => {
  it("undo button is disabled when there is no history", async () => {
    const page = await CanvasPage.create();

    const btn = page.screen.getByRole("button", { name: "Undo" });
    await expect.element(btn).toBeDisabled();
  });

  it("redo button is disabled when there is no redo history", async () => {
    const page = await CanvasPage.create();

    const btn = page.screen.getByRole("button", { name: "Redo" });
    await expect.element(btn).toBeDisabled();
  });

  it("undo restores element after drawing", async () => {
    const page = await CanvasPage.create();

    await page.canvas.createElement("rectangle", [2, 2], [5, 5]);
    page.scene.expectElementCount(1);

    await clickUndo(page);

    page.scene.expectElementCount(0);
  });

  it("redo restores undone element", async () => {
    const page = await CanvasPage.create();

    await page.canvas.createElement("rectangle", [2, 2], [5, 5]);
    page.scene.expectElementCount(1);

    await clickUndo(page);
    page.scene.expectElementCount(0);

    await clickRedo(page);
    page.scene.expectElementCount(1);
    page.scene.expectElementType(0, "rectangle");
  });

  it("undo restores element position after drag", async () => {
    const page = await CanvasPage.create();

    const rect = await page.canvas.createElement("rectangle", [2, 2], [5, 5]);
    const originalX = rect.get().x;
    const originalY = rect.get().y;

    // Click element center to select, then drag it
    const cx = rect.get().x + rect.get().width / 2;
    const cy = rect.get().y + rect.get().height / 2;
    await page.canvas.pointer.drag(cx, cy, cx + 100, cy + 100);
    await waitForPaint();

    expect(rect.get().x).not.toBe(originalX);

    await clickUndo(page);

    expect(rect.get().x).toBe(originalX);
    expect(rect.get().y).toBe(originalY);
  });

  it("undo button becomes enabled after drawing", async () => {
    const page = await CanvasPage.create();

    const btn = page.screen.getByRole("button", { name: "Undo" });
    await expect.element(btn).toBeDisabled();

    await page.canvas.createElement("rectangle", [2, 2], [5, 5]);

    await expect.element(btn).toBeEnabled();
  });

  it("redo button becomes enabled after undo", async () => {
    const page = await CanvasPage.create();

    await page.canvas.createElement("rectangle", [2, 2], [5, 5]);

    const redoBtn = page.screen.getByRole("button", { name: "Redo" });
    await expect.element(redoBtn).toBeDisabled();

    await clickUndo(page);

    await expect.element(redoBtn).toBeEnabled();
  });

  it("new drawing clears redo stack", async () => {
    const page = await CanvasPage.create();

    await page.canvas.createElement("rectangle", [2, 2], [5, 5]);
    await clickUndo(page);

    const redoBtn = page.screen.getByRole("button", { name: "Redo" });
    await expect.element(redoBtn).toBeEnabled();

    // Draw a new shape — should clear redo
    await page.canvas.createElement("ellipse", [3, 3], [6, 6]);

    await expect.element(redoBtn).toBeDisabled();
  });

  it("multiple undo/redo cycles preserve element types", async () => {
    const page = await CanvasPage.create();

    await page.canvas.createElement("rectangle", [1, 1], [3, 3]);
    await page.canvas.createElement("ellipse", [5, 1], [7, 3]);
    page.scene.expectElementCount(2);

    // Undo second shape
    await clickUndo(page);
    page.scene.expectElementCount(1);
    page.scene.expectElementType(0, "rectangle");

    // Undo first shape
    await clickUndo(page);
    page.scene.expectElementCount(0);

    // Redo first shape
    await clickRedo(page);
    page.scene.expectElementCount(1);
    page.scene.expectElementType(0, "rectangle");

    // Redo second shape
    await clickRedo(page);
    page.scene.expectElementCount(2);
    page.scene.expectElementType(1, "ellipse");
  });

  it("undo restores element after delete", async () => {
    const page = await CanvasPage.create();

    const rect = await page.canvas.createElement("rectangle", [2, 2], [5, 5]);
    page.scene.expectElementCount(1);

    // Switch to selection tool, select the element, and delete it
    await page.toolbar.select("selection");
    page.selection.setSelected(rect.get());
    await page.keyboard.press("{Delete}");
    await waitForPaint();

    expect(visibleElements(page)).toHaveLength(0);

    await clickUndo(page);

    expect(visibleElements(page)).toHaveLength(1);
    expect(visibleElements(page)[0]!.type).toBe("rectangle");
  });

  it("undo restores two rectangles after delete", async () => {
    const page = await CanvasPage.create();

    const r1 = await page.canvas.createElement("rectangle", [1, 1], [3, 3]);
    const r2 = await page.canvas.createElement("rectangle", [5, 1], [7, 3]);
    page.scene.expectElementCount(2);

    // Switch to selection tool, select both, and delete
    await page.toolbar.select("selection");
    page.selection.setSelected(r1.get(), r2.get());
    await page.keyboard.press("{Delete}");
    await waitForPaint();

    expect(visibleElements(page)).toHaveLength(0);

    // Undo should restore both rectangles
    await clickUndo(page);

    expect(visibleElements(page)).toHaveLength(2);
    expect(visibleElements(page)[0]!.type).toBe("rectangle");
    expect(visibleElements(page)[1]!.type).toBe("rectangle");
  });

  it("undo restores selection state after drawing", async () => {
    const page = await CanvasPage.create();

    // Draw two shapes — each draw auto-selects the new element
    const r1 = await page.canvas.createElement("rectangle", [1, 1], [3, 3]);
    const r2 = await page.canvas.createElement("ellipse", [5, 1], [7, 3]);

    // After second draw, r2 should be selected
    page.selection.expectSelected(r2.id);

    // Undo removes second shape — selection should revert to r1
    await clickUndo(page);

    page.scene.expectElementCount(1);
    page.selection.expectSelected(r1.id);
  });
});
