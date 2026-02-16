import { userEvent } from "vitest/browser";
import { CanvasPage } from "~/__test-utils__/browser";
import { waitForPaint } from "~/__test-utils__/browser/waiters";
import { API } from "~/__test-utils__/browser/api";

describe("clipboard (Cmd+C / Cmd+V)", () => {
  it("copies and pastes a selected element", async () => {
    const page = await CanvasPage.create();

    // User draws a rectangle
    const rect = await page.canvas.createElement("rectangle", [2, 2], [5, 5]);
    const originalElement = rect.get();

    // Element is auto-selected after drawing — verify
    page.selection.expectSelected(rect.id);
    page.scene.expectElementCount(1);

    // User presses Cmd+C to copy, Cmd+V to paste
    await page.keyboard.copy();
    await page.keyboard.paste();
    await waitForPaint();

    // A new element should appear (the paste)
    page.scene.expectElementCount(2);

    // The pasted element should be a copy of the original
    const pasted = page.scene.elements.find((el) => el.id !== rect.id)!;
    expect(pasted).toBeDefined();
    expect(pasted.type).toBe(originalElement.type);
    expect(pasted.width).toBe(originalElement.width);
    expect(pasted.height).toBe(originalElement.height);

    // Pasted element should be offset (not stacked exactly on top)
    const samePosition = pasted.x === originalElement.x && pasted.y === originalElement.y;
    expect(samePosition).toBe(false);

    // The pasted element should now be selected (not the original)
    page.selection.expectSelected(pasted.id);
  });

  it("copies multiple selected elements and pastes them all", async () => {
    const page = await CanvasPage.create();

    // User draws two shapes
    const r1 = await page.canvas.createElement("rectangle", [1, 1], [3, 3]);
    const r2 = await page.canvas.createElement("ellipse", [5, 1], [7, 3]);
    page.scene.expectElementCount(2);

    // User selects both elements
    await page.selection.selectElements(r1.get(), r2.get());
    page.selection.expectSelected(r1.id, r2.id);

    // User presses Cmd+C then Cmd+V
    await page.keyboard.copy();
    await page.keyboard.paste();
    await waitForPaint();

    // Should now have 4 elements (2 originals + 2 pasted)
    page.scene.expectElementCount(4);

    // Only the 2 pasted elements should be selected
    const selected = API.getSelectedElements();
    expect(selected).toHaveLength(2);
    expect(selected.every((el) => el.id !== r1.id && el.id !== r2.id)).toBe(true);
  });

  it("cut removes the original element and paste re-adds it", async () => {
    const page = await CanvasPage.create();

    const rect = await page.canvas.createElement("rectangle", [2, 2], [5, 5]);
    page.selection.expectSelected(rect.id);
    page.scene.expectElementCount(1);

    // User presses Cmd+X to cut
    await page.keyboard.cut();
    await waitForPaint();

    // Original element should be removed (or marked deleted)
    const visibleElements = page.scene.elements.filter((el) => !el.isDeleted);
    expect(visibleElements).toHaveLength(0);

    // User presses Cmd+V to paste
    await page.keyboard.paste();
    await waitForPaint();

    // Element should reappear
    const afterPaste = page.scene.elements.filter((el) => !el.isDeleted);
    expect(afterPaste).toHaveLength(1);
    expect(afterPaste[0]!.type).toBe("rectangle");
  });

  it("duplicates via the sidebar Duplicate button", async () => {
    const page = await CanvasPage.create();

    // User draws a rectangle (auto-selected → sidebar appears)
    const rect = await page.canvas.createElement("rectangle", [2, 2], [5, 5]);
    const original = rect.get();
    page.selection.expectSelected(rect.id);
    page.scene.expectElementCount(1);

    // User clicks the Duplicate button in the properties sidebar
    const duplicateBtn = page.screen.getByLabelText("Duplicate");
    await expect.element(duplicateBtn).toBeVisible();
    await userEvent.click(duplicateBtn);
    await waitForPaint();

    // A new element should appear
    page.scene.expectElementCount(2);

    // The duplicate should match the original's shape and size
    const dupe = page.scene.elements.find((el) => el.id !== rect.id)!;
    expect(dupe).toBeDefined();
    expect(dupe.type).toBe(original.type);
    expect(dupe.width).toBe(original.width);
    expect(dupe.height).toBe(original.height);

    // Duplicate should be offset from the original
    const samePosition = dupe.x === original.x && dupe.y === original.y;
    expect(samePosition).toBe(false);

    // The duplicate should be selected
    page.selection.expectSelected(dupe.id);
  });

  it("paste with nothing copied does nothing", async () => {
    const page = await CanvasPage.create();

    const rect = await page.canvas.createElement("rectangle", [2, 2], [5, 5]);
    page.selection.clear();
    await waitForPaint();

    // User presses Cmd+V without having copied anything
    await page.keyboard.paste();
    await waitForPaint();

    // Nothing should change
    page.scene.expectElementCount(1);
    expect(page.scene.elements[0]!.id).toBe(rect.id);
  });
});
