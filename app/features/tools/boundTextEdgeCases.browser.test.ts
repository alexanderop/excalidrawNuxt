import { userEvent } from "vitest/browser";
import { TestDrawVue, waitForPaint } from "~/__test-utils__/browser";
import type { ExcalidrawArrowElement, ExcalidrawTextElement } from "@drawvue/core";

describe("bound text edge cases", () => {
  it("arrow label via double-click", async () => {
    const td = await TestDrawVue.create();

    const arrow = await td.createElement("arrow", [2, 4], [10, 4]);
    const midpoint = td.grid.centerOf([2, 4], [10, 4]);

    td.setTool("selection");
    await td.clickElement(arrow.get());
    await td.dblClick(midpoint);
    await waitForPaint();

    const textarea = td.screen.getByRole("textbox");
    await expect.element(textarea).toBeVisible();

    await userEvent.type(textarea, "Label");
    await userEvent.keyboard("{Escape}");
    await waitForPaint();

    // Verify text element bound to arrow
    const nonDeleted = td.elements.filter((e) => !e.isDeleted);
    const textEl = nonDeleted.find((e) => e.type === "text") as ExcalidrawTextElement | undefined;
    expect(textEl).toBeDefined();
    expect(textEl!.containerId).toBe(arrow.id);

    const arrowEl = arrow.get() as ExcalidrawArrowElement;
    expect(arrowEl.boundElements).toBeDefined();
    expect(arrowEl.boundElements!.some((b) => b.type === "text")).toBe(true);
  });

  it("undo rect creation removes rect and its bound text", async () => {
    const td = await TestDrawVue.create();

    const rect = await td.createElement("rectangle", [3, 2], [7, 5]);
    const center = td.grid.centerOf([3, 2], [7, 5]);

    // Add bound text
    td.setTool("selection");
    await td.dblClick(center);
    await waitForPaint();

    const textarea = td.screen.getByRole("textbox");
    await userEvent.type(textarea, "Undo me");
    await userEvent.keyboard("{Escape}");
    await waitForPaint();

    // Verify: rect + text
    const nonDeletedBefore = td.elements.filter((e) => !e.isDeleted);
    expect(nonDeletedBefore.length).toBeGreaterThanOrEqual(2);

    // Undo text creation
    await td.undo();
    await waitForPaint();

    // Undo rect creation
    await td.undo();
    await waitForPaint();

    // No visible elements should remain
    const nonDeletedAfter = td.elements.filter((e) => !e.isDeleted);
    expect(nonDeletedAfter).toHaveLength(0);

    // Redo rect creation
    await td.redo();
    await waitForPaint();

    // Rect should be back
    const nonDeletedRedo1 = td.elements.filter((e) => !e.isDeleted);
    expect(nonDeletedRedo1.length).toBeGreaterThanOrEqual(1);
    expect(nonDeletedRedo1.some((e) => e.id === rect.id)).toBe(true);
  });

  it("undo delete of container restores both shape and bound text", async () => {
    const td = await TestDrawVue.create();

    const rect = await td.createElement("rectangle", [3, 2], [7, 5]);
    const center = td.grid.centerOf([3, 2], [7, 5]);

    // Add bound text
    td.setTool("selection");
    await td.dblClick(center);
    await waitForPaint();

    const textarea = td.screen.getByRole("textbox");
    await userEvent.type(textarea, "Restore me");
    await userEvent.keyboard("{Escape}");
    await waitForPaint();

    const countBefore = td.elements.filter((e) => !e.isDeleted).length;
    expect(countBefore).toBeGreaterThanOrEqual(2);

    // Delete the rectangle (should also delete bound text)
    await td.clickElement(td.getElement(rect.id));
    await td.deleteSelected();
    await waitForPaint();

    // Shape and bound text should be marked deleted
    const deletedAfterDel = td.elements.filter((e) => e.isDeleted);
    expect(deletedAfterDel.length).toBeGreaterThanOrEqual(1);
    const nonDeletedShapes = td.elements.filter((e) => !e.isDeleted && e.type !== "text");
    expect(nonDeletedShapes).toHaveLength(0);

    // Undo delete — both should be restored
    await td.undo();
    await waitForPaint();

    const nonDeletedAfterUndo = td.elements.filter((e) => !e.isDeleted);
    expect(nonDeletedAfterUndo.length).toBeGreaterThanOrEqual(2);

    // Verify binding still intact
    const restoredRect = td.getElement(rect.id);
    expect(restoredRect.boundElements?.some((b) => b.type === "text")).toBe(true);
  });

  it("editing bound text multiple times keeps single reference", async () => {
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

    // Edit again
    await td.dblClick(center);
    await waitForPaint();

    textarea = td.screen.getByRole("textbox");
    // Select all existing text and replace
    await userEvent.keyboard("{Control>}a{/Control}");
    await userEvent.type(textarea, "Second");
    await userEvent.keyboard("{Escape}");
    await waitForPaint();

    // Should have exactly 1 text element
    const textElements = td.elements.filter((e) => !e.isDeleted && e.type === "text");
    expect(textElements).toHaveLength(1);

    // Rect should have exactly 1 text binding
    const updatedRect = td.getElement(rect.id);
    const textBindings = updatedRect.boundElements?.filter((b) => b.type === "text") ?? [];
    expect(textBindings).toHaveLength(1);
  });

  it("whitespace-only text discarded on blur", async () => {
    const td = await TestDrawVue.create();

    const rect = await td.createElement("rectangle", [3, 2], [7, 5]);
    const center = td.grid.centerOf([3, 2], [7, 5]);

    td.setTool("selection");
    await td.dblClick(center);
    await waitForPaint();

    const textarea = td.screen.getByRole("textbox");
    await userEvent.type(textarea, "   ");
    await userEvent.keyboard("{Escape}");
    await waitForPaint();

    // No text element should exist
    const textElements = td.elements.filter((e) => !e.isDeleted && e.type === "text");
    expect(textElements).toHaveLength(0);

    // Rect should have no text bindings
    const updatedRect = td.getElement(rect.id);
    const textBindings = updatedRect.boundElements?.filter((b) => b.type === "text") ?? [];
    expect(textBindings).toHaveLength(0);
  });
});
