import { TestDrawVue, waitForPaint } from "~/__test-utils__/browser";
import type { ExcalidrawArrowElement } from "@drawvue/core";

describe("complex binding lifecycle", () => {
  it("two arrows bound to same shape both listed in boundElements", async () => {
    const td = await TestDrawVue.create();

    const rect = await td.createElement("rectangle", [7, 2], [10, 5]);

    // Arrow 1 ending in rect
    const arrow1 = await td.createElement("arrow", [2, 3], [8, 3]);
    const a1 = arrow1.get() as ExcalidrawArrowElement;
    expect(a1.endBinding).not.toBeNull();
    expect(a1.endBinding!.elementId).toBe(rect.id);

    // Arrow 2 ending in rect
    const arrow2 = await td.createElement("arrow", [2, 5], [8, 4]);
    const a2 = arrow2.get() as ExcalidrawArrowElement;
    expect(a2.endBinding).not.toBeNull();
    expect(a2.endBinding!.elementId).toBe(rect.id);

    // Rect should reference both arrows
    const updatedRect = td.getElement(rect.id);
    const arrowBindings = updatedRect.boundElements?.filter((b) => b.type === "arrow") ?? [];
    expect(arrowBindings).toHaveLength(2);
    expect(arrowBindings.map((b) => b.id)).toContain(arrow1.id);
    expect(arrowBindings.map((b) => b.id)).toContain(arrow2.id);
  });

  it("deleting one arrow preserves the other's binding", async () => {
    const td = await TestDrawVue.create();

    const rect = await td.createElement("rectangle", [7, 2], [10, 5]);
    const arrow1 = await td.createElement("arrow", [2, 3], [8, 3]);
    const arrow2 = await td.createElement("arrow", [2, 5], [8, 4]);

    // Programmatically select and delete arrow1
    td.select(arrow1.get());
    await td.deleteSelected();
    await waitForPaint();

    // Arrow1 should be deleted
    expect(arrow1.get().isDeleted).toBe(true);

    // Arrow2 should still exist and binding intact
    const a2 = arrow2.get() as ExcalidrawArrowElement;
    expect(a2.isDeleted).toBe(false);
    expect(a2.endBinding).not.toBeNull();
    expect(a2.endBinding!.elementId).toBe(rect.id);

    // Rect should still exist
    const updatedRect = td.getElement(rect.id);
    expect(updatedRect.isDeleted).toBe(false);
  });

  it("deleting bound shape nullifies arrow binding", async () => {
    const td = await TestDrawVue.create();

    const rect = await td.createElement("rectangle", [2, 2], [5, 5]);
    const arrow = await td.createElement("arrow", [3, 3], [10, 4]);

    const arrowBefore = arrow.get() as ExcalidrawArrowElement;
    expect(arrowBefore.startBinding).not.toBeNull();

    // Delete rect
    await td.clickElement(td.getElement(rect.id));
    await td.deleteSelected();
    await waitForPaint();

    // Arrow should still exist but binding gone
    const arrowAfter = arrow.get() as ExcalidrawArrowElement;
    expect(arrowAfter.isDeleted).toBe(false);
    expect(arrowAfter.startBinding).toBeNull();
  });

  it("undo delete of bound shape restores binding", async () => {
    const td = await TestDrawVue.create();

    const rect = await td.createElement("rectangle", [2, 2], [5, 5]);
    const arrow = await td.createElement("arrow", [3, 3], [10, 4]);

    // Delete rect
    await td.clickElement(td.getElement(rect.id));
    await td.deleteSelected();
    await waitForPaint();

    const arrowAfterDel = arrow.get() as ExcalidrawArrowElement;
    expect(arrowAfterDel.startBinding).toBeNull();

    // Undo
    await td.undo();
    await waitForPaint();

    // Binding should be restored
    const arrowRestored = arrow.get() as ExcalidrawArrowElement;
    expect(arrowRestored.startBinding).not.toBeNull();
    expect(arrowRestored.startBinding!.elementId).toBe(rect.id);

    // Rect should reference the arrow
    const restoredRect = td.getElement(rect.id);
    expect(restoredRect.boundElements).toContainEqual(
      expect.objectContaining({ id: arrow.id, type: "arrow" }),
    );
  });

  it("arrow with only start bound keeps end null", async () => {
    const td = await TestDrawVue.create();

    await td.createElement("rectangle", [2, 2], [4, 4]);

    // Draw arrow from inside rect to far empty space
    const arrow = await td.createElement("arrow", [3, 3], [12, 7]);
    const arrowEl = arrow.get() as ExcalidrawArrowElement;

    expect(arrowEl.startBinding).not.toBeNull();
    expect(arrowEl.endBinding).toBeNull();
  });

  it("arrow with only end bound keeps start null", async () => {
    const td = await TestDrawVue.create();

    await td.createElement("rectangle", [10, 2], [12, 4]);

    // Draw arrow from far empty space to inside rect
    const arrow = await td.createElement("arrow", [2, 3], [11, 3]);
    const arrowEl = arrow.get() as ExcalidrawArrowElement;

    expect(arrowEl.startBinding).toBeNull();
    expect(arrowEl.endBinding).not.toBeNull();
  });

  it("grouping shapes does not break arrow binding", async () => {
    const td = await TestDrawVue.create();

    const rect1 = await td.createElement("rectangle", [1, 2], [4, 5]);
    const rect2 = await td.createElement("rectangle", [9, 2], [12, 5]);
    const arrow = await td.createElement("arrow", [2, 3], [10, 3]);

    const arrowBefore = arrow.get() as ExcalidrawArrowElement;
    expect(arrowBefore.startBinding).not.toBeNull();
    expect(arrowBefore.endBinding).not.toBeNull();

    // Select both rects (not arrow) and group
    await td.selectElements(rect1.get(), rect2.get());
    await td.group();
    await waitForPaint();

    // Verify grouped
    expect(td.getElement(rect1.id).groupIds.length).toBeGreaterThan(0);

    // Arrow bindings should still be intact
    const arrowAfter = arrow.get() as ExcalidrawArrowElement;
    expect(arrowAfter.startBinding).not.toBeNull();
    expect(arrowAfter.startBinding!.elementId).toBe(rect1.id);
    expect(arrowAfter.endBinding).not.toBeNull();
    expect(arrowAfter.endBinding!.elementId).toBe(rect2.id);
  });

  it("moving a group updates bound arrow", async () => {
    const td = await TestDrawVue.create();

    const rect1 = await td.createElement("rectangle", [2, 2], [5, 5]);
    const rect2 = await td.createElement("rectangle", [9, 2], [12, 5]);
    const arrow = await td.createElement("arrow", [3, 3], [10, 3]);

    const arrowBefore = arrow.get() as ExcalidrawArrowElement;
    expect(arrowBefore.startBinding).not.toBeNull();

    const arrowXBefore = arrowBefore.x;
    const arrowYBefore = arrowBefore.y;

    // Group both shapes
    await td.selectElements(rect1.get(), rect2.get());
    await td.group();
    await waitForPaint();

    // Click on one of the group members, then drag
    await td.clickElement(td.getElement(rect1.id));
    await td.drag([3, 3], [3, 6]);
    await waitForPaint();

    // Arrow binding should still be intact
    const arrowAfter = arrow.get() as ExcalidrawArrowElement;
    expect(arrowAfter.startBinding).not.toBeNull();

    // Arrow should have updated its position or points
    const arrowMoved =
      arrowAfter.x !== arrowXBefore ||
      arrowAfter.y !== arrowYBefore ||
      arrowAfter.points.some(
        (pt, i) =>
          Math.abs(pt[0] - arrowBefore.points[i]![0]) > 1 ||
          Math.abs(pt[1] - arrowBefore.points[i]![1]) > 1,
      );
    expect(arrowMoved).toBe(true);
  });
});
