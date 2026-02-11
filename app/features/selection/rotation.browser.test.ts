import { CanvasPage } from "~/__test-utils__/browser";
import { API } from "~/__test-utils__/browser/api";
import { waitForPaint } from "~/__test-utils__/browser/waiters";
import { getTransformHandles, getTransformHandleAtPosition } from "./transformHandles";
import { pointFrom } from "~/shared/math";
import type { GlobalPoint } from "~/shared/math";
import { rotateElement } from "./rotateElement";

/** Return the center of the rotation handle in scene coordinates. */
function rotationHandleCenter(el: Parameters<typeof getTransformHandles>[0], zoom: number) {
  const handles = getTransformHandles(el, zoom);
  const rot = handles.rotation;
  if (!rot) throw new Error("No rotation handle found");
  return { x: rot[0] + rot[2] / 2, y: rot[1] + rot[3] / 2 };
}

describe("element rotation", () => {
  it("rotates a selected rectangle via rotation handle drag", async () => {
    const page = await CanvasPage.create();

    // Draw a rectangle via pointer — auto-selects it and resets to selection tool
    await page.toolbar.select("rectangle");
    await page.canvas.pointer.drag(200, 150, 400, 350);
    await waitForPaint();

    const el = page.scene.elements[0]!;
    expect(el.angle).toBe(0);
    page.selection.expectSelected(el.id);
    expect(API.activeTool).toBe("selection");

    // Compute rotation handle center
    const handle = rotationHandleCenter(el, API.zoom);

    // Verify handle detection works
    const detectedHandle = getTransformHandleAtPosition(
      pointFrom<GlobalPoint>(handle.x, handle.y),
      el,
      API.zoom,
    );
    expect(detectedHandle).toBe("rotation");

    // Drag from rotation handle to a point to the right of center (≈90° clockwise)
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    await page.canvas.pointer.drag(handle.x, handle.y, cx + 200, cy, { steps: 10 });
    await waitForPaint();

    // Diagnostic: check if selection survived the drag (if cleared, pointerdown missed handle)
    const selectedAfterDrag = API.getSelectedElements();
    expect(selectedAfterDrag).toHaveLength(1);

    expect(el.angle).not.toBe(0);
    expect(el.angle).toBeGreaterThan(0.3);
  });

  it("rotateElement function directly mutates element angle", async () => {
    const page = await CanvasPage.create();

    const el = page.scene.addElement({ x: 200, y: 150, width: 200, height: 200 });
    await page.scene.flush();

    expect(el.angle).toBe(0);

    // Directly call rotateElement (bypassing pointer events)
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    const pointerRight = pointFrom<GlobalPoint>(cx + 200, cy);
    rotateElement(pointerRight, el, false);

    expect(el.angle).not.toBe(0);
    expect(el.angle).toBeCloseTo(Math.PI / 2, 1);
  });

  it("preserves element center during rotation", async () => {
    const page = await CanvasPage.create();

    const el = page.scene.addElement({ x: 200, y: 150, width: 200, height: 200 });
    await page.scene.flush();

    const centerBefore = {
      x: el.x + el.width / 2,
      y: el.y + el.height / 2,
    };

    // Use direct mutation (known to work) for this property test
    const pointerRight = pointFrom<GlobalPoint>(centerBefore.x + 150, centerBefore.y + 100);
    rotateElement(pointerRight, el, false);

    const centerAfter = {
      x: el.x + el.width / 2,
      y: el.y + el.height / 2,
    };

    expect(centerAfter.x).toBeCloseTo(centerBefore.x, 0);
    expect(centerAfter.y).toBeCloseTo(centerBefore.y, 0);
  });

  it("preserves element size during rotation", async () => {
    const page = await CanvasPage.create();

    const el = page.scene.addElement({ x: 200, y: 150, width: 200, height: 200 });
    await page.scene.flush();

    const widthBefore = el.width;
    const heightBefore = el.height;

    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    const pointerRight = pointFrom<GlobalPoint>(cx + 100, cy + 100);
    rotateElement(pointerRight, el, false);

    expect(el.width).toBeCloseTo(widthBefore, 1);
    expect(el.height).toBeCloseTo(heightBefore, 1);
  });

  it("rotating one element does not affect other elements", async () => {
    const page = await CanvasPage.create();

    const el1 = page.scene.addElement({ x: 50, y: 50, width: 150, height: 150 });
    const el2 = page.scene.addElement({ x: 400, y: 300, width: 100, height: 100 });
    await page.scene.flush();

    const cx = el1.x + el1.width / 2;
    const cy = el1.y + el1.height / 2;
    const pointerRight = pointFrom<GlobalPoint>(cx + 100, cy + 100);
    rotateElement(pointerRight, el1, false);

    expect(el1.angle).not.toBe(0);
    expect(el2.angle).toBe(0);
  });
});
