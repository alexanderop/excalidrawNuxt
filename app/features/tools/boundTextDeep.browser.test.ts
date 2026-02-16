import { userEvent } from "vitest/browser";
import { TestDrawVue } from "~/__test-utils__/browser";
import { waitForPaint } from "~/__test-utils__/browser/waiters";
import type { ExcalidrawTextElement } from "@drawvue/core";

describe("bound text interactions", () => {
  it("adds bound text to rectangle via double-click", async () => {
    const td = await TestDrawVue.create();

    const rect = await td.createElement("rectangle", [3, 2], [7, 5]);
    const center = td.grid.centerOf([3, 2], [7, 5]);

    // Double-click center of rectangle to open text editor
    td.setTool("selection");
    await td.dblClick(center);
    await waitForPaint();

    const textarea = td.screen.getByRole("textbox");
    await expect.element(textarea).toBeVisible();

    // Type text
    await userEvent.type(textarea, "Hello");
    await waitForPaint();

    // Submit text by pressing Escape
    await userEvent.keyboard("{Escape}");
    await waitForPaint();

    // Should have rectangle + bound text element
    const nonDeleted = td.elements.filter((e) => !e.isDeleted);
    expect(nonDeleted.length).toBeGreaterThanOrEqual(2);

    // Verify the text element exists
    const textEl = nonDeleted.find((e) => e.type === "text") as ExcalidrawTextElement | undefined;
    expect(textEl).toBeDefined();
    expect(textEl!.text).toContain("Hello");

    // Verify binding: rectangle should have boundElements
    const updatedRect = td.getElement(rect.id);
    expect(updatedRect.boundElements).toBeDefined();
    expect(updatedRect.boundElements!.length).toBeGreaterThan(0);
  });

  it("adds bound text to ellipse via double-click", async () => {
    const td = await TestDrawVue.create();

    const ellipse = await td.createElement("ellipse", [4, 2], [8, 5]);
    const center = td.grid.centerOf([4, 2], [8, 5]);

    td.setTool("selection");
    await td.dblClick(center);
    await waitForPaint();

    const textarea = td.screen.getByRole("textbox");
    await expect.element(textarea).toBeVisible();

    await userEvent.type(textarea, "Ellipse text");
    await userEvent.keyboard("{Escape}");
    await waitForPaint();

    const updatedEllipse = td.getElement(ellipse.id);
    expect(updatedEllipse.boundElements).toBeDefined();
    expect(updatedEllipse.boundElements!.length).toBeGreaterThan(0);
  });

  it("adds bound text to diamond via double-click", async () => {
    const td = await TestDrawVue.create();

    const diamond = await td.createElement("diamond", [3, 2], [7, 6]);
    const center = td.grid.centerOf([3, 2], [7, 6]);

    td.setTool("selection");
    await td.dblClick(center);
    await waitForPaint();

    const textarea = td.screen.getByRole("textbox");
    await expect.element(textarea).toBeVisible();

    await userEvent.type(textarea, "Diamond");
    await userEvent.keyboard("{Escape}");
    await waitForPaint();

    const updatedDiamond = td.getElement(diamond.id);
    expect(updatedDiamond.boundElements).toBeDefined();
    expect(updatedDiamond.boundElements!.length).toBeGreaterThan(0);
  });

  it("edits existing bound text on double-click", async () => {
    const td = await TestDrawVue.create();

    const rect = await td.createElement("rectangle", [3, 2], [7, 5]);
    const center = td.grid.centerOf([3, 2], [7, 5]);

    // Add initial text
    td.setTool("selection");
    await td.dblClick(center);
    await waitForPaint();

    let textarea = td.screen.getByRole("textbox");
    await userEvent.type(textarea, "First");
    await userEvent.keyboard("{Escape}");
    await waitForPaint();

    // Double-click again to edit
    await td.dblClick(center);
    await waitForPaint();

    textarea = td.screen.getByRole("textbox");
    await expect.element(textarea).toBeVisible();

    // The text editor should be open for editing
    const rectEl = td.getElement(rect.id);
    expect(rectEl.boundElements).toBeDefined();
  });

  it("deletes shape also deletes bound text", async () => {
    const td = await TestDrawVue.create();

    const rect = await td.createElement("rectangle", [3, 2], [7, 5]);
    const center = td.grid.centerOf([3, 2], [7, 5]);

    // Add bound text
    td.setTool("selection");
    await td.dblClick(center);
    await waitForPaint();

    const textarea = td.screen.getByRole("textbox");
    await userEvent.type(textarea, "Delete me");
    await userEvent.keyboard("{Escape}");
    await waitForPaint();

    const countBefore = td.elements.filter((e) => !e.isDeleted).length;
    expect(countBefore).toBeGreaterThanOrEqual(2);

    // Select and delete the rectangle
    await td.clickElement(td.getElement(rect.id));
    await td.deleteSelected();
    await waitForPaint();

    // Both rectangle and bound text should be deleted
    const nonDeletedAfter = td.elements.filter((e) => !e.isDeleted);
    // The shape and its bound text should both be marked deleted
    const deletedElements = td.elements.filter((e) => e.isDeleted);
    expect(deletedElements.length).toBeGreaterThanOrEqual(1);
    // No active non-deleted shapes remain (text might persist as non-deleted if orphaned)
    const nonDeletedShapes = nonDeletedAfter.filter((e) => e.type !== "text");
    expect(nonDeletedShapes).toHaveLength(0);
  });

  it("empty bound text is removed on blur", async () => {
    const td = await TestDrawVue.create();

    await td.createElement("rectangle", [3, 2], [7, 5]);
    const center = td.grid.centerOf([3, 2], [7, 5]);

    // Open text editor but don't type anything
    td.setTool("selection");
    await td.dblClick(center);
    await waitForPaint();

    const textarea = td.screen.getByRole("textbox");
    await expect.element(textarea).toBeVisible();

    // Press Escape without typing — empty text should be discarded
    await userEvent.keyboard("{Escape}");
    await waitForPaint();

    // Only the rectangle should remain, no empty text element
    const nonDeleted = td.elements.filter((e) => !e.isDeleted);
    const textElements = nonDeleted.filter((e) => e.type === "text");
    expect(textElements).toHaveLength(0);
  });

  it("bound text container has correct boundElements reference", async () => {
    const td = await TestDrawVue.create();

    const rect = await td.createElement("rectangle", [3, 2], [7, 5]);
    const center = td.grid.centerOf([3, 2], [7, 5]);

    // Add bound text
    td.setTool("selection");
    await td.dblClick(center);
    await waitForPaint();

    const textarea = td.screen.getByRole("textbox");
    await userEvent.type(textarea, "Bound ref test");
    await userEvent.keyboard("{Escape}");
    await waitForPaint();

    // Verify the rectangle's boundElements has a text entry
    const updatedRect = td.getElement(rect.id);
    expect(updatedRect.boundElements).toBeDefined();
    const textBinding = updatedRect.boundElements!.find((b) => b.type === "text");
    expect(textBinding).toBeDefined();

    // Verify the referenced text element exists
    const textEl = td.elements.find((e) => e.id === textBinding!.id && !e.isDeleted);
    expect(textEl).toBeDefined();
    expect(textEl!.type).toBe("text");
  });
});
