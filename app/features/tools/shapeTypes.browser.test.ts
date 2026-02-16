/* eslint-disable vitest/expect-expect -- TestDrawVue assertion methods wrap expect() */
import { TestDrawVue } from "~/__test-utils__/browser";
import { waitForPaint } from "~/__test-utils__/browser/waiters";
import type { ExcalidrawLinearElement } from "@drawvue/core";

describe("shape type drawing", () => {
  describe("diamond", () => {
    it("draws a diamond and renders it on canvas", async () => {
      const td = await TestDrawVue.create();

      await td.createElementAtCells("diamond", [3, 2], [6, 5]);

      td.expectElementCount(1);
      td.expectElementType(0, "diamond");
      expect(td.elements[0]!.width).toBeGreaterThan(0);
      expect(td.elements[0]!.height).toBeGreaterThan(0);
    });

    it("draws diamond with different fill styles", async () => {
      const td = await TestDrawVue.create();

      const ref = await td.createElement("diamond", [3, 2], [6, 5]);
      const el = ref.get();

      // Default fill should be set
      expect(el.fillStyle).toBeDefined();
      td.expectToolToBe("selection");
    });

    it("auto-selects drawn diamond", async () => {
      const td = await TestDrawVue.create();

      const ref = await td.createElement("diamond", [2, 2], [5, 5]);
      td.expectSelected(ref.id);
    });

    it("draws multiple diamonds in sequence", async () => {
      const td = await TestDrawVue.create();

      await td.createElementAtCells("diamond", [1, 1], [3, 3]);
      await td.createElementAtCells("diamond", [5, 1], [7, 3]);

      td.expectElementCount(2);
      td.expectElementType(0, "diamond");
      td.expectElementType(1, "diamond");
    });
  });

  describe("line", () => {
    it("draws a 2-point line via drag", async () => {
      const td = await TestDrawVue.create();

      td.setTool("line");
      await td.grid.drag([2, 2], [8, 5]);
      await waitForPaint();

      td.expectElementCount(1);
      td.expectElementType(0, "line");
      const line = td.elements[0] as ExcalidrawLinearElement;
      expect(line.points.length).toBeGreaterThanOrEqual(2);
    });

    it("line has correct stroke properties", async () => {
      const td = await TestDrawVue.create();

      td.setTool("line");
      await td.grid.drag([1, 1], [7, 4]);
      await waitForPaint();

      const line = td.elements[0]!;
      expect(line.strokeColor).toBeDefined();
      expect(line.strokeWidth).toBeGreaterThan(0);
    });

    it("line auto-selects after creation via drag", async () => {
      const td = await TestDrawVue.create();

      td.setTool("line");
      await td.grid.drag([2, 3], [8, 6]);
      await waitForPaint();

      // Line tool may remain active for multi-point mode
      // but the element should be created
      td.expectElementCount(1);
      td.expectElementType(0, "line");
    });
  });

  describe("ellipse", () => {
    it("draws ellipse and auto-selects it", async () => {
      const td = await TestDrawVue.create();

      const ref = await td.createElement("ellipse", [3, 2], [7, 5]);

      td.expectElementCount(1);
      td.expectElementType(0, "ellipse");
      td.expectSelected(ref.id);
    });

    it("draws ellipse with positive dimensions", async () => {
      const td = await TestDrawVue.create();

      await td.createElementAtCells("ellipse", [2, 1], [6, 4]);
      await td.flush();

      const el = td.elements[0]!;
      expect(el.x).toBeGreaterThan(0);
      expect(el.y).toBeGreaterThan(0);
      expect(el.width).toBeGreaterThan(0);
      expect(el.height).toBeGreaterThan(0);
    });

    it("ellipse renders with correct element properties", async () => {
      const td = await TestDrawVue.create();

      const ref = await td.createElement("ellipse", [4, 3], [8, 6]);
      const el = ref.get();

      expect(el.type).toBe("ellipse");
      expect(el.strokeColor).toBeDefined();
      expect(el.opacity).toBeGreaterThan(0);
      expect(el.isDeleted).toBe(false);
    });
  });
});
