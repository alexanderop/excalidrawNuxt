import { TestDrawVue } from "~/__test-utils__/browser";
import { waitForPaint } from "~/__test-utils__/browser/waiters";
import type { ExcalidrawArrowElement } from "@drawvue/core";

describe("arrow binding deep", () => {
  describe("binding to various shapes", () => {
    it("arrow binds to ellipse when drawn into it", async () => {
      const td = await TestDrawVue.create();

      const ellipse = await td.createElement("ellipse", [8, 2], [12, 5]);
      const arrow = await td.createElement("arrow", [2, 3], [10, 3]);
      const arrowEl = arrow.get() as ExcalidrawArrowElement;

      expect(arrowEl.endBinding).not.toBeNull();
      expect(arrowEl.endBinding!.elementId).toBe(ellipse.id);
    });

    it("arrow binds to diamond when drawn into it", async () => {
      const td = await TestDrawVue.create();

      const diamond = await td.createElement("diamond", [8, 2], [12, 6]);
      const arrow = await td.createElement("arrow", [2, 4], [10, 4]);
      const arrowEl = arrow.get() as ExcalidrawArrowElement;

      expect(arrowEl.endBinding).not.toBeNull();
      expect(arrowEl.endBinding!.elementId).toBe(diamond.id);
    });

    it("arrow does not bind when endpoint is far from any shape", async () => {
      const td = await TestDrawVue.create();

      await td.createElement("rectangle", [1, 1], [3, 3]);
      const arrow = await td.createElement("arrow", [8, 6], [12, 8]);
      const arrowEl = arrow.get() as ExcalidrawArrowElement;

      expect(arrowEl.startBinding).toBeNull();
      expect(arrowEl.endBinding).toBeNull();
    });
  });

  describe("bound arrow updates on shape changes", () => {
    it("moving bound shape keeps binding intact", async () => {
      const td = await TestDrawVue.create();

      const rect = await td.createElement("rectangle", [2, 2], [5, 5]);
      const arrow = await td.createElement("arrow", [3, 3], [10, 4]);
      const arrowBefore = arrow.get() as ExcalidrawArrowElement;
      expect(arrowBefore.startBinding).not.toBeNull();

      // Select and move the rectangle
      await td.clickElement(td.getElement(rect.id));
      await td.drag([3, 3], [3, 6]);
      await waitForPaint();

      // Binding must still be intact after shape move
      const arrowAfter = arrow.get() as ExcalidrawArrowElement;
      expect(arrowAfter.startBinding).not.toBeNull();
      expect(arrowAfter.startBinding!.elementId).toBe(rect.id);
    });

    it("deleting bound shape unbinds arrow gracefully", async () => {
      const td = await TestDrawVue.create();

      const rect = await td.createElement("rectangle", [2, 2], [5, 5]);
      const arrow = await td.createElement("arrow", [3, 3], [10, 4]);

      const arrowBefore = arrow.get() as ExcalidrawArrowElement;
      expect(arrowBefore.startBinding).not.toBeNull();

      // Delete the rectangle
      await td.clickElement(td.getElement(rect.id));
      await td.deleteSelected();
      await waitForPaint();

      // Arrow should still exist but binding should be gone
      const arrowAfter = arrow.get() as ExcalidrawArrowElement;
      expect(arrowAfter.isDeleted).toBe(false);
      expect(arrowAfter.startBinding).toBeNull();
    });
  });

  describe("unbinding", () => {
    it("dragging arrow away from shape unbinds it", async () => {
      const td = await TestDrawVue.create();

      await td.createElement("rectangle", [2, 2], [5, 5]);
      const arrow = await td.createElement("arrow", [3, 3], [10, 4]);

      const arrowBefore = arrow.get() as ExcalidrawArrowElement;
      expect(arrowBefore.startBinding).not.toBeNull();

      // Select only the arrow and drag it far away
      await td.clickElement(arrow.get());
      await td.drag([6, 3], [6, 7]);
      await waitForPaint();

      const arrowAfter = arrow.get() as ExcalidrawArrowElement;
      expect(arrowAfter.startBinding).toBeNull();
    });

    it("undo unbind restores the binding", async () => {
      const td = await TestDrawVue.create();

      const rect = await td.createElement("rectangle", [2, 2], [5, 5]);
      const arrow = await td.createElement("arrow", [3, 3], [10, 4]);

      const arrowBefore = arrow.get() as ExcalidrawArrowElement;
      expect(arrowBefore.startBinding).not.toBeNull();

      // Drag arrow away to unbind
      await td.clickElement(arrow.get());
      await td.drag([6, 3], [6, 7]);
      await waitForPaint();

      const arrowUnbound = arrow.get() as ExcalidrawArrowElement;
      expect(arrowUnbound.startBinding).toBeNull();

      // Undo should restore binding
      await td.undo();
      await waitForPaint();

      const arrowRestored = arrow.get() as ExcalidrawArrowElement;
      expect(arrowRestored.startBinding).not.toBeNull();
      expect(arrowRestored.startBinding!.elementId).toBe(rect.id);
    });
  });

  describe("bi-directional binding", () => {
    it("arrow connecting two different shape types binds both ends", async () => {
      const td = await TestDrawVue.create();

      const rect = await td.createElement("rectangle", [1, 2], [4, 5]);
      const ellipse = await td.createElement("ellipse", [9, 2], [12, 5]);

      const arrow = await td.createElement("arrow", [2, 3], [10, 3]);
      const arrowEl = arrow.get() as ExcalidrawArrowElement;

      expect(arrowEl.startBinding).not.toBeNull();
      expect(arrowEl.startBinding!.elementId).toBe(rect.id);
      expect(arrowEl.endBinding).not.toBeNull();
      expect(arrowEl.endBinding!.elementId).toBe(ellipse.id);
    });

    it("both shapes have arrow in their boundElements", async () => {
      const td = await TestDrawVue.create();

      const rect = await td.createElement("rectangle", [1, 2], [4, 5]);
      const ellipse = await td.createElement("ellipse", [9, 2], [12, 5]);
      const arrow = await td.createElement("arrow", [2, 3], [10, 3]);

      const updatedRect = td.getElement(rect.id);
      const updatedEllipse = td.getElement(ellipse.id);

      expect(updatedRect.boundElements).toContainEqual(
        expect.objectContaining({ id: arrow.id, type: "arrow" }),
      );
      expect(updatedEllipse.boundElements).toContainEqual(
        expect.objectContaining({ id: arrow.id, type: "arrow" }),
      );
    });
  });

  describe("binding survives operations", () => {
    it("creating more elements does not break existing bindings", async () => {
      const td = await TestDrawVue.create();

      const rect = await td.createElement("rectangle", [2, 2], [5, 5]);
      const arrow = await td.createElement("arrow", [3, 3], [10, 4]);

      const arrowBefore = arrow.get() as ExcalidrawArrowElement;
      expect(arrowBefore.startBinding).not.toBeNull();

      // Create more elements
      await td.createElement("rectangle", [12, 1], [14, 3]);
      await td.createElement("ellipse", [12, 5], [14, 7]);
      await waitForPaint();

      const arrowAfter = arrow.get() as ExcalidrawArrowElement;
      expect(arrowAfter.startBinding).not.toBeNull();
      expect(arrowAfter.startBinding!.elementId).toBe(rect.id);
    });

    it("undo/redo cycle preserves bindings", async () => {
      const td = await TestDrawVue.create();

      const rect = await td.createElement("rectangle", [2, 2], [5, 5]);
      const arrow = await td.createElement("arrow", [3, 3], [10, 4]);

      const arrowBefore = arrow.get() as ExcalidrawArrowElement;
      expect(arrowBefore.startBinding).not.toBeNull();

      // Undo arrow creation
      await td.undo();
      await waitForPaint();

      // Redo arrow creation
      await td.redo();
      await waitForPaint();

      const arrowAfter = arrow.get() as ExcalidrawArrowElement;
      expect(arrowAfter.startBinding).not.toBeNull();
      expect(arrowAfter.startBinding!.elementId).toBe(rect.id);
    });
  });
});
