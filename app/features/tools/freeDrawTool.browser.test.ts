/* eslint-disable vitest/expect-expect -- page object methods wrap expect() */
import type { ExcalidrawFreeDrawElement } from "@drawvue/core";
import { CanvasPage } from "~/__test-utils__/browser";
import { waitForPaint } from "~/__test-utils__/browser/waiters";

describe("free draw tool", () => {
  it("creates a freedraw element on drag", async () => {
    const page = await CanvasPage.create();

    await page.toolbar.select("freedraw");
    await page.canvas.grid.drag([2, 2], [6, 5], { steps: 10 });
    await waitForPaint();

    page.scene.expectElementCount(1);
    page.scene.expectElementType(0, "freedraw");

    const el = page.scene.elements[0] as ExcalidrawFreeDrawElement;
    expect(el.points.length).toBeGreaterThan(1);
    expect(el.width).toBeGreaterThan(0);
    expect(el.height).toBeGreaterThan(0);
    expect(el.lastCommittedPoint).not.toBeNull();
  });

  it("keeps the pencil tool active after drawing", async () => {
    const page = await CanvasPage.create();

    await page.toolbar.select("freedraw");
    await page.canvas.grid.drag([2, 2], [5, 5]);
    await waitForPaint();

    expect(page.scene.activeTool).toBe("freedraw");
    await page.toolbar.expectActive("freedraw");
  });

  it("does not auto-select the drawn stroke", async () => {
    const page = await CanvasPage.create();

    await page.toolbar.select("freedraw");
    await page.canvas.grid.drag([2, 2], [5, 5]);
    await waitForPaint();

    page.selection.expectNoneSelected();
  });

  it("draws multiple strokes as separate elements", async () => {
    const page = await CanvasPage.create();

    await page.toolbar.select("freedraw");

    await page.canvas.grid.drag([1, 1], [4, 3]);
    await waitForPaint();

    await page.canvas.grid.drag([5, 2], [8, 6]);
    await waitForPaint();

    await page.canvas.grid.drag([2, 5], [7, 7]);
    await waitForPaint();

    page.scene.expectElementCount(3);
    page.scene.expectElementType(0, "freedraw");
    page.scene.expectElementType(1, "freedraw");
    page.scene.expectElementType(2, "freedraw");
  });

  it("accumulates points along the drag path", async () => {
    const page = await CanvasPage.create();

    await page.toolbar.select("freedraw");
    await page.canvas.grid.drag([2, 2], [8, 5], { steps: 20 });
    await waitForPaint();

    const el = page.scene.elements[0] as ExcalidrawFreeDrawElement;
    // Initial [0,0] + up to 20 pointermove steps (duplicates skipped)
    expect(el.points.length).toBeGreaterThanOrEqual(10);
    // First point is at local origin
    expect(el.points[0]![0]).toBe(0);
    expect(el.points[0]![1]).toBe(0);
  });

  it("uses simulated pressure for mouse input", async () => {
    const page = await CanvasPage.create();

    await page.toolbar.select("freedraw");
    await page.canvas.grid.drag([2, 2], [5, 5]);
    await waitForPaint();

    const el = page.scene.elements[0] as ExcalidrawFreeDrawElement;
    expect(el.simulatePressure).toBe(true);
  });

  it("creates a dot on single click", async () => {
    const page = await CanvasPage.create();

    await page.toolbar.select("freedraw");
    await page.canvas.grid.click([4, 4]);
    await waitForPaint();

    page.scene.expectElementCount(1);
    const el = page.scene.elements[0] as ExcalidrawFreeDrawElement;
    // Single click → 2 points (original + nudged to avoid degenerate stroke)
    expect(el.points).toHaveLength(2);
    expect(el.lastCommittedPoint).not.toBeNull();
  });

  it("computes position and bounding box from the stroke", async () => {
    const page = await CanvasPage.create();

    await page.toolbar.select("freedraw");
    await page.canvas.grid.drag([2, 2], [6, 5], { steps: 10 });
    await waitForPaint();

    const el = page.scene.elements[0] as ExcalidrawFreeDrawElement;
    expect(el.x).toBeGreaterThan(0);
    expect(el.y).toBeGreaterThan(0);
    expect(el.width).toBeGreaterThan(0);
    expect(el.height).toBeGreaterThan(0);
  });

  it("activates via P keyboard shortcut", async () => {
    const page = await CanvasPage.create();

    await page.keyboard.press("p");

    expect(page.scene.activeTool).toBe("freedraw");
    await page.toolbar.expectActive("freedraw");
  });

  it("draws a stroke then selects it with the selection tool", async () => {
    const page = await CanvasPage.create();

    await page.toolbar.select("freedraw");
    await page.canvas.grid.drag([3, 3], [6, 5], { steps: 10 });
    await waitForPaint();

    const el = page.scene.elements[0]!;

    // Switch to selection and click on the stroke
    await page.toolbar.select("selection");
    await page.canvas.pointer.clickOn(el);

    page.selection.expectSelected(el.id);
  });

  it("preserves existing elements when drawing new strokes", async () => {
    const page = await CanvasPage.create();

    // Add a rectangle programmatically
    const rect = page.scene.addElement({ type: "rectangle", x: 50, y: 50, width: 100, height: 80 });

    await page.toolbar.select("freedraw");
    await page.canvas.grid.drag([6, 1], [9, 4]);
    await waitForPaint();

    page.scene.expectElementCount(2);
    expect(page.scene.elements[0]!.id).toBe(rect.id);
    page.scene.expectElementType(1, "freedraw");
  });

  it("switches from pencil to another tool and back", async () => {
    const page = await CanvasPage.create();

    // Pencil → draw stroke
    await page.toolbar.select("freedraw");
    await page.canvas.grid.drag([1, 1], [4, 3]);
    await waitForPaint();

    // Switch to rectangle → draw shape
    await page.canvas.createElementAtCells("rectangle", [6, 1], [9, 4]);

    // Back to pencil → draw another stroke
    await page.toolbar.select("freedraw");
    await page.canvas.grid.drag([2, 5], [5, 7]);
    await waitForPaint();

    page.scene.expectElementCount(3);
    page.scene.expectElementType(0, "freedraw");
    page.scene.expectElementType(1, "rectangle");
    page.scene.expectElementType(2, "freedraw");
  });

  it("draws at the correct position (not at canvas origin)", async () => {
    const page = await CanvasPage.create();

    await page.toolbar.select("freedraw");
    // Draw from cell [3,3] to [6,5] — cell [3,3] center is at roughly (280, 280) in scene coords
    await page.canvas.grid.drag([3, 3], [6, 5], { steps: 10 });
    await waitForPaint();

    page.scene.expectElementCount(1);
    const el = page.scene.elements[0] as ExcalidrawFreeDrawElement;

    // The element x/y should be near the scene coordinate of cell [3,3], not near 0
    // Grid: 16 cols x 9 rows on 1280x720 → cell width = 80, center of [3,3] = (280, 280)
    // Allow generous tolerance for pointer interpolation
    expect(el.x).toBeGreaterThan(100);
    expect(el.y).toBeGreaterThan(100);
    // Should NOT be at the canvas origin
    expect(el.x).not.toBe(0);
    expect(el.y).not.toBe(0);
  });

  it("shows properties panel when freedraw tool is active", async () => {
    const page = await CanvasPage.create();

    await page.toolbar.select("freedraw");

    // The properties sidebar should be visible with freedraw tool active (no elements selected).
    // Opacity is always shown in the panel — use it as a visibility marker.
    await expect.element(page.screen.getByText("Opacity")).toBeVisible();

    // Freedraw supports stroke color — verify the Stroke label is visible
    await expect.element(page.screen.getByText("Stroke")).toBeVisible();
    await expect.element(page.screen.getByLabelText("Stroke color")).toBeVisible();
  });

  it("hides properties panel for selection tool with no selection", async () => {
    const page = await CanvasPage.create();

    // Default tool is selection, no elements — panel should not be rendered
    await expect.element(page.screen.getByText("Opacity")).not.toBeInTheDocument();
  });

  it("applies default stroke color to new strokes", async () => {
    const page = await CanvasPage.create();

    await page.toolbar.select("freedraw");
    await page.canvas.grid.drag([2, 2], [5, 4], { steps: 8 });
    await waitForPaint();

    const el = page.scene.elements[0] as ExcalidrawFreeDrawElement;
    expect(el.strokeColor).toBe("#1e1e1e");
  });

  it("applies default stroke width to new strokes", async () => {
    const page = await CanvasPage.create();

    await page.toolbar.select("freedraw");
    await page.canvas.grid.drag([2, 2], [5, 4], { steps: 8 });
    await waitForPaint();

    const el = page.scene.elements[0] as ExcalidrawFreeDrawElement;
    expect(el.strokeWidth).toBe(2);
  });

  it("new element inherits style defaults", async () => {
    const page = await CanvasPage.create();

    await page.toolbar.select("freedraw");
    await page.canvas.grid.drag([2, 2], [6, 5], { steps: 10 });
    await waitForPaint();

    const el = page.scene.elements[0] as ExcalidrawFreeDrawElement;

    // Verify all default style properties
    expect(el.strokeColor).toBe("#1e1e1e");
    expect(el.backgroundColor).toBe("transparent");
    expect(el.strokeWidth).toBe(2);
    expect(el.fillStyle).toBe("hachure");
    expect(el.roughness).toBe(1);
    expect(el.opacity).toBe(100);
  });

  it("shows freedraw-relevant property sections in the panel", async () => {
    const page = await CanvasPage.create();

    await page.toolbar.select("freedraw");

    // Freedraw has stroke color and background color
    await expect.element(page.screen.getByLabelText("Stroke color")).toBeVisible();
    await expect.element(page.screen.getByLabelText("Background color")).toBeVisible();

    // Freedraw has Style group (fill style, stroke width, dash)
    await expect.element(page.screen.getByText("Style")).toBeVisible();
    await expect.element(page.screen.getByText("Width")).toBeVisible();

    // Freedraw has Shape group (roughness, but NOT edges/roundness)
    await expect.element(page.screen.getByText("Shape")).toBeVisible();
    await expect.element(page.screen.getByText("Rough")).toBeVisible();
    await expect.element(page.screen.getByText("Edges")).not.toBeInTheDocument();

    // No text or arrowhead controls
    await expect.element(page.screen.getByText("Text")).not.toBeInTheDocument();
    await expect.element(page.screen.getByText("Arrowheads")).not.toBeInTheDocument();
  });
});
