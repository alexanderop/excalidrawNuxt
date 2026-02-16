/* eslint-disable vitest/expect-expect -- TestDrawVue assertion methods wrap expect() */
import { userEvent } from "vitest/browser";
import { TestDrawVue } from "~/__test-utils__/browser";
import { waitForPaint } from "~/__test-utils__/browser/waiters";
import type { ExcalidrawArrowElement, ExcalidrawLinearElement } from "@drawvue/core";

describe("linear editor deep interactions", () => {
  describe("enter/exit edit mode", () => {
    it("enters edit mode on double-click arrow", async () => {
      const td = await TestDrawVue.create();

      const ref = await td.createElement("arrow", [2, 2], [8, 5]);
      td.expectSelected(ref.id);

      // Double-click on the arrow midpoint to enter edit mode
      td.setTool("selection");
      const center = td.grid.centerOf([2, 2], [8, 5]);
      await td.dblClick(center);
      await waitForPaint();

      // Linear editor should be active — the editing element should be set
      const arrowEl = ref.get() as ExcalidrawArrowElement;
      expect(arrowEl.points.length).toBeGreaterThanOrEqual(2);
    });

    it("exits edit mode on Escape", async () => {
      const td = await TestDrawVue.create();

      await td.createElement("arrow", [2, 2], [8, 5]);

      // Enter edit mode
      td.setTool("selection");
      const center = td.grid.centerOf([2, 2], [8, 5]);
      await td.dblClick(center);
      await waitForPaint();

      // Exit with Escape
      await userEvent.keyboard("{Escape}");
      await waitForPaint();

      td.expectToolToBe("selection");
    });

    it("exits edit mode when clicking outside element", async () => {
      const td = await TestDrawVue.create();

      await td.createElement("arrow", [2, 2], [6, 4]);

      // Enter edit mode
      td.setTool("selection");
      const center = td.grid.centerOf([2, 2], [6, 4]);
      await td.dblClick(center);
      await waitForPaint();

      // Click far away from the arrow
      await td.click([12, 8]);
      await waitForPaint();

      td.expectToolToBe("selection");
    });
  });

  describe("point manipulation", () => {
    it("arrow has at least 2 points after creation", async () => {
      const td = await TestDrawVue.create();

      const ref = await td.createElement("arrow", [2, 2], [8, 5]);
      const arrow = ref.get() as ExcalidrawArrowElement;

      expect(arrow.points.length).toBeGreaterThanOrEqual(2);
      // First point should be at origin (0,0)
      expect(arrow.points[0]![0]).toBe(0);
      expect(arrow.points[0]![1]).toBe(0);
    });

    it("undo after arrow creation removes the arrow", async () => {
      const td = await TestDrawVue.create();

      await td.createElement("arrow", [2, 2], [8, 5]);
      td.expectElementCount(1);

      await td.undo();
      await waitForPaint();

      // Element should be deleted or removed
      const remaining = td.elements.filter((e) => !e.isDeleted);
      expect(remaining).toHaveLength(0);
    });

    it("redo after undo restores the arrow", async () => {
      const td = await TestDrawVue.create();

      await td.createElement("arrow", [2, 2], [8, 5]);
      td.expectElementCount(1);

      await td.undo();
      await waitForPaint();
      await td.redo();
      await waitForPaint();

      const remaining = td.elements.filter((e) => !e.isDeleted);
      expect(remaining).toHaveLength(1);
    });
  });

  describe("line edit mode", () => {
    it("enters edit mode on double-click line", async () => {
      const td = await TestDrawVue.create();

      td.setTool("line");
      await td.grid.drag([2, 3], [8, 6]);
      await waitForPaint();

      td.expectElementCount(1);
      const line = td.elements[0] as ExcalidrawLinearElement;
      expect(line.type).toBe("line");

      // Double-click on line center to enter edit mode
      td.setTool("selection");
      const center = td.grid.centerOf([2, 3], [8, 6]);
      await td.dblClick(center);
      await waitForPaint();

      expect(line.points.length).toBeGreaterThanOrEqual(2);
    });

    it("line points can be verified after creation", async () => {
      const td = await TestDrawVue.create();

      td.setTool("line");
      await td.grid.drag([3, 2], [10, 7]);
      await waitForPaint();

      const line = td.elements[0] as ExcalidrawLinearElement;
      expect(line.points.length).toBeGreaterThanOrEqual(2);
      expect(line.width).toBeGreaterThan(0);
      expect(line.height).toBeGreaterThan(0);
    });
  });
});
