import { TestDrawVue, waitForPaint } from "~/__test-utils__/browser";
import { getTransformHandles } from "@drawvue/core";
import type { TransformHandle, TransformHandleDirection } from "@drawvue/core";
import type { ExcalidrawElement } from "@drawvue/core";

async function clickUndo(td: TestDrawVue): Promise<void> {
  const btn = td.screen.getByRole("button", { name: "Undo" });
  await btn.click();
  await waitForPaint();
}

/**
 * Get the center of a transform handle in scene coordinates.
 */
function getHandleCenter(
  element: ExcalidrawElement,
  direction: TransformHandleDirection,
  zoom = 1,
): { x: number; y: number } {
  const handles = getTransformHandles(element, zoom);
  const handle = handles[direction] as TransformHandle | undefined;
  if (!handle) throw new Error(`Handle "${direction}" not found for element ${element.id}`);
  return {
    x: handle[0] + handle[2] / 2,
    y: handle[1] + handle[3] / 2,
  };
}

describe("resize elements", () => {
  it("resizes rectangle larger from SE corner", async () => {
    const td = await TestDrawVue.create();

    const ref = await td.createElement("rectangle", [3, 2], [7, 5]);
    const el = ref.get();
    const originalWidth = el.width;
    const originalHeight = el.height;

    // Ensure the element is selected
    td.expectSelected(ref.id);

    // Get the SE handle position and drag it outward
    const seHandle = getHandleCenter(el, "se", td.zoom);
    await td.pointer.drag(seHandle.x, seHandle.y, seHandle.x + 50, seHandle.y + 40);
    await waitForPaint();

    const updated = td.getElement(ref.id);
    expect(updated.width).toBeGreaterThan(originalWidth);
    expect(updated.height).toBeGreaterThan(originalHeight);
  });

  it("resizes rectangle from NW corner — x/y move and dimensions change", async () => {
    const td = await TestDrawVue.create();

    const ref = await td.createElement("rectangle", [4, 3], [8, 6]);
    const el = ref.get();
    const originalX = el.x;
    const originalY = el.y;
    const originalWidth = el.width;
    const originalHeight = el.height;

    td.expectSelected(ref.id);

    const nwHandle = getHandleCenter(el, "nw", td.zoom);
    // Drag NW corner further up-left (negative offset = smaller x/y, bigger dims)
    await td.pointer.drag(nwHandle.x, nwHandle.y, nwHandle.x - 30, nwHandle.y - 25);
    await waitForPaint();

    const updated = td.getElement(ref.id);
    expect(updated.x).toBeLessThan(originalX);
    expect(updated.y).toBeLessThan(originalY);
    expect(updated.width).toBeGreaterThan(originalWidth);
    expect(updated.height).toBeGreaterThan(originalHeight);
  });

  it("resize from east handle changes only width", async () => {
    const td = await TestDrawVue.create();

    // Make a large enough rectangle so side handles appear (need > 5 * HANDLE_SIZE / zoom)
    const ref = await td.createElement("rectangle", [2, 1], [10, 6]);
    const el = ref.get();
    const originalWidth = el.width;
    const originalHeight = el.height;
    const originalY = el.y;

    td.expectSelected(ref.id);

    const handles = getTransformHandles(el, td.zoom);
    expect(handles.e).toBeDefined();

    const eHandle = getHandleCenter(el, "e", td.zoom);
    await td.pointer.drag(eHandle.x, eHandle.y, eHandle.x + 40, eHandle.y);
    await waitForPaint();

    const updated = td.getElement(ref.id);
    expect(updated.width).toBeGreaterThan(originalWidth);
    // Height should remain approximately the same
    expect(Math.abs(updated.height - originalHeight)).toBeLessThan(2);
    expect(Math.abs(updated.y - originalY)).toBeLessThan(2);
  });

  it("resize from south handle changes only height", async () => {
    const td = await TestDrawVue.create();

    const ref = await td.createElement("rectangle", [2, 1], [10, 6]);
    const el = ref.get();
    const originalWidth = el.width;
    const originalHeight = el.height;
    const originalX = el.x;

    td.expectSelected(ref.id);

    const handles = getTransformHandles(el, td.zoom);
    expect(handles.s).toBeDefined();

    const sHandle = getHandleCenter(el, "s", td.zoom);
    await td.pointer.drag(sHandle.x, sHandle.y, sHandle.x, sHandle.y + 40);
    await waitForPaint();

    const updated = td.getElement(ref.id);
    expect(updated.height).toBeGreaterThan(originalHeight);
    // Width should remain approximately the same
    expect(Math.abs(updated.width - originalWidth)).toBeLessThan(2);
    expect(Math.abs(updated.x - originalX)).toBeLessThan(2);
  });

  it("shift+drag locks aspect ratio", async () => {
    const td = await TestDrawVue.create();

    const ref = await td.createElement("rectangle", [3, 2], [7, 5]);
    const el = ref.get();
    const originalRatio = el.width / el.height;

    td.expectSelected(ref.id);

    const seHandle = getHandleCenter(el, "se", td.zoom);
    // Drag with shift held — should lock aspect ratio
    await td.pointer.withModifiers({ shiftKey: true }, async () => {
      await td.pointer.drag(seHandle.x, seHandle.y, seHandle.x + 60, seHandle.y + 30);
    });
    await waitForPaint();

    const updated = td.getElement(ref.id);
    const newRatio = updated.width / updated.height;
    // Aspect ratios should be approximately equal
    expect(newRatio).toBeCloseTo(originalRatio, 0);
  });

  it("undo restores original size after resize", async () => {
    const td = await TestDrawVue.create();

    const ref = await td.createElement("rectangle", [3, 2], [7, 5]);
    const el = ref.get();
    const widthBeforeResize = el.width;

    td.expectSelected(ref.id);

    const seHandle = getHandleCenter(el, "se", td.zoom);
    await td.pointer.drag(seHandle.x, seHandle.y, seHandle.x + 50, seHandle.y + 40);
    await waitForPaint();

    // Verify resize happened
    const resized = td.getElement(ref.id);
    expect(resized.width).toBeGreaterThan(widthBeforeResize + 20);

    // Undo should restore the pre-resize dimensions
    await clickUndo(td);

    const restored = td.getElement(ref.id);
    expect(restored.width).toBe(widthBeforeResize);
  });
});
