import { userEvent } from "vitest/browser";
import { TestDrawVue } from "~/__test-utils__/browser";
import { waitForPaint } from "~/__test-utils__/browser/waiters";
import type { ExcalidrawArrowElement } from "@drawvue/core";

describe("arrow binding stability", () => {
  describe("binding creation", () => {
    it("arrow drawn from inside a shape binds its start to that shape", async () => {
      const td = await TestDrawVue.create();

      // Draw a rectangle in cells [2,2]→[5,5]
      const rect = await td.createElement("rectangle", [2, 2], [5, 5]);

      // Draw an arrow starting from inside the rectangle to empty space
      const arrow = await td.createElement("arrow", [3, 3], [10, 4]);
      const arrowEl = arrow.get() as ExcalidrawArrowElement;

      expect(arrowEl.startBinding).not.toBeNull();
      expect(arrowEl.startBinding!.elementId).toBe(rect.id);
    });

    it("arrow drawn into a shape binds its end to that shape", async () => {
      const td = await TestDrawVue.create();

      // Draw a rectangle
      const rect = await td.createElement("rectangle", [8, 2], [12, 5]);

      // Draw an arrow from empty space into the rectangle
      const arrow = await td.createElement("arrow", [2, 3], [10, 3]);
      const arrowEl = arrow.get() as ExcalidrawArrowElement;

      expect(arrowEl.endBinding).not.toBeNull();
      expect(arrowEl.endBinding!.elementId).toBe(rect.id);
    });

    it("arrow connects two shapes — both endpoints bound", async () => {
      const td = await TestDrawVue.create();

      const rect1 = await td.createElement("rectangle", [1, 2], [4, 5]);
      const rect2 = await td.createElement("rectangle", [9, 2], [12, 5]);

      // Draw arrow from center of rect1 to center of rect2
      const arrow = await td.createElement("arrow", [2, 3], [10, 3]);
      const arrowEl = arrow.get() as ExcalidrawArrowElement;

      expect(arrowEl.startBinding).not.toBeNull();
      expect(arrowEl.startBinding!.elementId).toBe(rect1.id);
      expect(arrowEl.endBinding).not.toBeNull();
      expect(arrowEl.endBinding!.elementId).toBe(rect2.id);
    });

    it("shape's boundElements array includes the arrow", async () => {
      const td = await TestDrawVue.create();

      const rect = await td.createElement("rectangle", [2, 2], [5, 5]);
      const arrow = await td.createElement("arrow", [3, 3], [10, 4]);

      const updatedRect = td.getElement(rect.id);
      expect(updatedRect.boundElements).toContainEqual(
        expect.objectContaining({ id: arrow.id, type: "arrow" }),
      );
    });
  });

  describe("binding survives shape movement", () => {
    it("dragging a shape updates its bound arrow — binding stays intact", async () => {
      const td = await TestDrawVue.create();

      const rect = await td.createElement("rectangle", [2, 2], [5, 5]);
      const arrow = await td.createElement("arrow", [3, 3], [10, 4]);
      const arrowEl = arrow.get() as ExcalidrawArrowElement;
      expect(arrowEl.startBinding).not.toBeNull();

      // Select and move the rectangle
      await td.clickElement(td.getElement(rect.id));
      await td.drag([3, 3], [3, 6]);
      await waitForPaint();

      // Binding must still be intact
      const movedArrow = arrow.get() as ExcalidrawArrowElement;
      expect(movedArrow.startBinding).not.toBeNull();
      expect(movedArrow.startBinding!.elementId).toBe(rect.id);
    });

    it("dragging arrow+shape together preserves binding", async () => {
      const td = await TestDrawVue.create();

      const rect = await td.createElement("rectangle", [2, 2], [5, 5]);
      const arrow = await td.createElement("arrow", [3, 3], [10, 4]);

      // Select both elements
      await td.selectElements(td.getElement(rect.id), arrow.get());
      await waitForPaint();

      // Drag them together
      await td.drag([3, 3], [3, 6]);
      await waitForPaint();

      // Binding must survive co-drag
      const movedArrow = arrow.get() as ExcalidrawArrowElement;
      expect(movedArrow.startBinding).not.toBeNull();
      expect(movedArrow.startBinding!.elementId).toBe(rect.id);
    });
  });

  describe("binding survives text editing", () => {
    it("adding text to a connected shape does not break arrow binding", async () => {
      const td = await TestDrawVue.create();

      // Create two rectangles connected by an arrow
      const rect1 = await td.createElement("rectangle", [1, 2], [4, 5]);
      const rect2 = await td.createElement("rectangle", [9, 2], [12, 5]);
      const arrow = await td.createElement("arrow", [2, 3], [10, 3]);

      const arrowBefore = arrow.get() as ExcalidrawArrowElement;
      expect(arrowBefore.startBinding).not.toBeNull();
      expect(arrowBefore.endBinding).not.toBeNull();

      // Double-click rect1 to add text (which may resize the container)
      td.setTool("selection");
      await td.dblClick([2, 3]);
      await waitForPaint();

      const textarea = td.screen.getByRole("textbox");
      await expect.element(textarea).toBeVisible();

      // Type enough text to potentially trigger container resize
      await userEvent.type(textarea, "Hello World from rectangle one");
      await waitForPaint();

      // Submit text
      await userEvent.keyboard("{Escape}");
      await waitForPaint();

      // Arrow bindings must still be intact after text was added
      const arrowAfter = arrow.get() as ExcalidrawArrowElement;
      expect(arrowAfter.startBinding).not.toBeNull();
      expect(arrowAfter.startBinding!.elementId).toBe(rect1.id);
      expect(arrowAfter.endBinding).not.toBeNull();
      expect(arrowAfter.endBinding!.elementId).toBe(rect2.id);
    });

    it("editing text on a shape preserves arrows on the other shape too", async () => {
      const td = await TestDrawVue.create();

      // Create two rectangles connected by an arrow
      const rect1 = await td.createElement("rectangle", [1, 2], [4, 5]);
      const rect2 = await td.createElement("rectangle", [9, 2], [12, 5]);
      const arrow = await td.createElement("arrow", [2, 3], [10, 3]);

      // Double-click rect2 to add text
      td.setTool("selection");
      await td.dblClick([10, 3]);
      await waitForPaint();

      const textarea = td.screen.getByRole("textbox");
      await expect.element(textarea).toBeVisible();

      await userEvent.type(textarea, "End node");
      await userEvent.keyboard("{Escape}");
      await waitForPaint();

      // Verify binding to rect1 (the OTHER shape) is still intact
      const arrowAfter = arrow.get() as ExcalidrawArrowElement;
      expect(arrowAfter.startBinding).not.toBeNull();
      expect(arrowAfter.startBinding!.elementId).toBe(rect1.id);
      expect(arrowAfter.endBinding).not.toBeNull();
      expect(arrowAfter.endBinding!.elementId).toBe(rect2.id);
    });
  });

  describe("binding survives further canvas activity", () => {
    it("creating more elements after a bound arrow does not break existing binding", async () => {
      const td = await TestDrawVue.create();

      const rect = await td.createElement("rectangle", [2, 2], [5, 5]);
      const arrow = await td.createElement("arrow", [3, 3], [10, 4]);

      const arrowBefore = arrow.get() as ExcalidrawArrowElement;
      expect(arrowBefore.startBinding).not.toBeNull();
      expect(arrowBefore.startBinding!.elementId).toBe(rect.id);

      // Create more elements elsewhere — existing binding must persist
      await td.createElement("rectangle", [12, 2], [14, 4]);
      await td.createElement("ellipse", [12, 5], [14, 7]);
      await waitForPaint();

      const arrowAfter = arrow.get() as ExcalidrawArrowElement;
      expect(arrowAfter.startBinding).not.toBeNull();
      expect(arrowAfter.startBinding!.elementId).toBe(rect.id);
    });
  });

  describe("unbinding only when appropriate", () => {
    it("dragging an arrow away from its shape unbinds", async () => {
      const td = await TestDrawVue.create();

      await td.createElement("rectangle", [2, 2], [5, 5]);
      const arrow = await td.createElement("arrow", [3, 3], [10, 4]);

      const arrowBefore = arrow.get() as ExcalidrawArrowElement;
      expect(arrowBefore.startBinding).not.toBeNull();

      // Select only the arrow and drag it far away
      await td.clickElement(arrow.get());
      await td.drag([6, 3], [6, 7]);
      await waitForPaint();

      // Arrow should unbind from the shape it was dragged away from
      const arrowAfter = arrow.get() as ExcalidrawArrowElement;
      expect(arrowAfter.startBinding).toBeNull();
    });
  });
});
