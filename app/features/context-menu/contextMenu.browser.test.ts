/* eslint-disable vitest/expect-expect -- TestDrawVue assertion methods wrap expect() */
import { commands } from "vitest/browser";
import { TestDrawVue, waitForPaint } from "~/__test-utils__/browser";

const CANVAS_SELECTOR = '[data-testid="interactive-canvas"]';

/**
 * Dispatch a native contextmenu event at the given canvas-relative coordinates.
 * This triggers DrawVue's handleContextMenu which determines menu type
 * (element vs canvas) and updates selection accordingly.
 */
async function rightClickCanvas(x: number, y: number): Promise<void> {
  await commands.canvasClick(CANVAS_SELECTOR, x, y);
  // Now dispatch a contextmenu event at the same position
  // eslint-disable-next-line no-restricted-syntax -- need raw canvas element for synthetic contextmenu event
  const canvas = document.querySelector<HTMLCanvasElement>(CANVAS_SELECTOR)!;
  const rect = canvas.getBoundingClientRect();
  const event = new MouseEvent("contextmenu", {
    clientX: rect.left + x,
    clientY: rect.top + y,
    bubbles: true,
    cancelable: true,
    button: 2,
  });
  Object.defineProperty(event, "offsetX", { value: x });
  Object.defineProperty(event, "offsetY", { value: y });
  canvas.dispatchEvent(event);
  await waitForPaint();
}

describe("context menu", () => {
  it("right-click on element selects it", async () => {
    const td = await TestDrawVue.create();

    const el = td.addElement({ x: 100, y: 100, width: 120, height: 80 });
    td.clearSelection();
    await td.flush();

    td.expectNoneSelected();

    // Right-click on the element's center
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    await rightClickCanvas(cx, cy);

    td.expectSelected(el.id);
  });

  it("right-click on empty canvas clears selection", async () => {
    const td = await TestDrawVue.create();

    const el = td.addElement({ x: 100, y: 100, width: 120, height: 80 });
    td.select(el);
    await td.flush();

    td.expectSelected(el.id);

    // Right-click on empty space far from the element
    await rightClickCanvas(500, 500);

    td.expectNoneSelected();
  });

  it("right-click on unselected element when another is selected switches selection", async () => {
    const td = await TestDrawVue.create();

    const [el1, el2] = td.addElements(
      { x: 50, y: 50, width: 100, height: 80 },
      { x: 300, y: 50, width: 100, height: 80 },
    );
    td.select(el1!);
    await td.flush();

    td.expectSelected(el1!.id);

    // Right-click on el2
    const cx = el2!.x + el2!.width / 2;
    const cy = el2!.y + el2!.height / 2;
    await rightClickCanvas(cx, cy);

    td.expectSelected(el2!.id);
  });

  it("right-click on already-selected element keeps it selected", async () => {
    const td = await TestDrawVue.create();

    const el = td.addElement({ x: 100, y: 100, width: 120, height: 80 });
    td.select(el);
    await td.flush();

    td.expectSelected(el.id);

    // Right-click on the same element
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    await rightClickCanvas(cx, cy);

    td.expectSelected(el.id);
  });

  it("delete action removes the selected element", async () => {
    const td = await TestDrawVue.create();

    const el = td.addElement({ x: 100, y: 100, width: 120, height: 80 });
    td.select(el);
    await td.flush();

    td.expectElementCount(1);
    td.expectSelected(el.id);

    // Press Delete to remove the selected element (same action as context menu Delete)
    await td.deleteSelected();
    await td.flush();

    const updated = td.getElement(el.id);
    expect(updated.isDeleted).toBe(true);
  });

  it("duplicate action creates a copy of the selected element", async () => {
    const td = await TestDrawVue.create();

    const el = td.addElement({ x: 100, y: 100, width: 120, height: 80 });
    td.select(el);
    await td.flush();

    td.expectElementCount(1);

    // Ctrl+D triggers the duplicate action (same as context menu Duplicate)
    await td.withModifiers({ ctrlKey: true }, async () => {
      await td.keyPress("d");
    });
    await td.flush();

    td.expectElementCount(2);

    // The duplicate should have the same dimensions
    const duplicate = td.elements.find((e) => e.id !== el.id && !e.isDeleted)!;
    expect(duplicate).toBeDefined();
    expect(duplicate.type).toBe("rectangle");
    expect(duplicate.width).toBe(el.width);
    expect(duplicate.height).toBe(el.height);
  });
});
