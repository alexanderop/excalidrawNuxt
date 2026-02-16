import { userEvent } from "vitest/browser";
import { TestDrawVue, waitForPaint } from "~/__test-utils__/browser";

describe("pan and zoom", () => {
  describe("zoom", () => {
    it("zooms in with BottomBar zoom-in button", async () => {
      const td = await TestDrawVue.create();
      const zoomBefore = td.zoom;

      const zoomInBtn = td.screen.getByRole("button", { name: "Zoom in" });
      await userEvent.click(zoomInBtn);
      await waitForPaint();

      expect(td.zoom).toBeGreaterThan(zoomBefore);
    });

    it("zooms out with BottomBar zoom-out button", async () => {
      const td = await TestDrawVue.create();
      const zoomBefore = td.zoom;

      const zoomOutBtn = td.screen.getByRole("button", { name: "Zoom out" });
      await userEvent.click(zoomOutBtn);
      await waitForPaint();

      expect(td.zoom).toBeLessThan(zoomBefore);
    });

    it("resets zoom to 100% with BottomBar reset button", async () => {
      const td = await TestDrawVue.create();

      // First zoom in
      td.zoomBy(0.5);
      await waitForPaint();
      expect(td.zoom).not.toBeCloseTo(1, 1);

      const resetBtn = td.screen.getByRole("button", { name: "Reset zoom" });
      await userEvent.click(resetBtn);
      await waitForPaint();

      expect(td.zoom).toBeCloseTo(1, 5);
    });

    it("zooms with Ctrl+wheel", async () => {
      const td = await TestDrawVue.create();
      const zoomBefore = td.zoom;

      // Ctrl+wheel up should zoom in (negative deltaY)
      await td.wheel([8, 4], { deltaY: -100, ctrlKey: true });
      await waitForPaint();

      expect(td.zoom).toBeGreaterThan(zoomBefore);
    });
  });

  describe("pan", () => {
    it("pans vertically with plain mouse wheel", async () => {
      const td = await TestDrawVue.create();
      const scrollYBefore = td.scrollY;

      // Plain wheel scrolls vertically (panBy is called with -deltaY)
      await td.wheel([8, 4], { deltaY: 100 });
      await waitForPaint();

      expect(td.scrollY).not.toBeCloseTo(scrollYBefore, 0);
    });

    it("pans horizontally with Shift+wheel", async () => {
      const td = await TestDrawVue.create();
      const scrollXBefore = td.scrollX;

      await td.wheel([8, 4], { deltaY: 100, shiftKey: true });
      await waitForPaint();

      expect(td.scrollX).not.toBeCloseTo(scrollXBefore, 0);
    });

    it("pans with Space+drag", async () => {
      const td = await TestDrawVue.create();
      const scrollXBefore = td.scrollX;
      const scrollYBefore = td.scrollY;

      // Hold space, drag, release space
      await td.keyboard.withModifierKeys({}, async () => {
        await td.keyPress("{Space>}");
        await td.drag([4, 4], [8, 6]);
        await td.keyPress("{/Space}");
      });
      await waitForPaint();

      // At least one axis should have changed
      const xChanged = Math.abs(td.scrollX - scrollXBefore) > 1;
      const yChanged = Math.abs(td.scrollY - scrollYBefore) > 1;
      expect(xChanged || yChanged).toBe(true);
    });

    it("pans with hand tool drag", async () => {
      const td = await TestDrawVue.create();
      const scrollXBefore = td.scrollX;
      const scrollYBefore = td.scrollY;

      await td.selectTool("hand");
      await td.drag([4, 4], [8, 6]);
      await waitForPaint();

      const xChanged = Math.abs(td.scrollX - scrollXBefore) > 1;
      const yChanged = Math.abs(td.scrollY - scrollYBefore) > 1;
      expect(xChanged || yChanged).toBe(true);
    });

    it("pans with middle mouse button drag", async () => {
      const td = await TestDrawVue.create();
      const scrollXBefore = td.scrollX;
      const scrollYBefore = td.scrollY;

      await td.middleClickDrag([4, 4], [8, 6]);
      await waitForPaint();

      const xChanged = Math.abs(td.scrollX - scrollXBefore) > 1;
      const yChanged = Math.abs(td.scrollY - scrollYBefore) > 1;
      expect(xChanged || yChanged).toBe(true);
    });
  });
});
