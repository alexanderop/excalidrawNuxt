import { API, CanvasPage, waitForPaint } from "~/__test-utils__/browser";
import { createElement } from "@drawvue/core";
import { userEvent } from "vitest/browser";

describe("layer ordering via PropertiesPanel buttons", () => {
  it("bring to front moves selected element to last position", async () => {
    const page = await CanvasPage.create();

    const a = createElement("rectangle", 50, 50, { width: 100, height: 80 });
    const b = createElement("rectangle", 100, 100, { width: 100, height: 80 });
    const c = createElement("rectangle", 150, 150, { width: 100, height: 80 });
    API.h.addElement(a);
    API.h.addElement(b);
    API.h.addElement(c);

    // Select A (first element) and bring to front
    API.setSelectedElements([a]);
    await page.scene.flush();

    const bringToFrontBtn = page.screen.getByLabelText("Bring to front");
    await userEvent.click(bringToFrontBtn);
    await waitForPaint();

    const ids = API.elements.map((el) => el.id);
    expect(ids.at(-1)).toBe(a.id);
  });

  it("send to back moves selected element to first position", async () => {
    const page = await CanvasPage.create();

    const a = createElement("rectangle", 50, 50, { width: 100, height: 80 });
    const b = createElement("rectangle", 100, 100, { width: 100, height: 80 });
    const c = createElement("rectangle", 150, 150, { width: 100, height: 80 });
    API.h.addElement(a);
    API.h.addElement(b);
    API.h.addElement(c);

    // Select C (last element) and send to back
    API.setSelectedElements([c]);
    await page.scene.flush();

    const sendToBackBtn = page.screen.getByLabelText("Send to back");
    await userEvent.click(sendToBackBtn);
    await waitForPaint();

    const ids = API.elements.map((el) => el.id);
    expect(ids[0]).toBe(c.id);
  });

  it("bring forward moves element up one position", async () => {
    const page = await CanvasPage.create();

    const a = createElement("rectangle", 50, 50, { width: 100, height: 80 });
    const b = createElement("rectangle", 100, 100, { width: 100, height: 80 });
    const c = createElement("rectangle", 150, 150, { width: 100, height: 80 });
    API.h.addElement(a);
    API.h.addElement(b);
    API.h.addElement(c);

    // Select A (index 0) and bring forward one step
    API.setSelectedElements([a]);
    await page.scene.flush();

    const bringForwardBtn = page.screen.getByLabelText("Bring forward");
    await userEvent.click(bringForwardBtn);
    await waitForPaint();

    const ids = API.elements.map((el) => el.id);
    expect(ids[0]).toBe(b.id);
    expect(ids[1]).toBe(a.id);
    expect(ids[2]).toBe(c.id);
  });

  it("send backward moves element down one position", async () => {
    const page = await CanvasPage.create();

    const a = createElement("rectangle", 50, 50, { width: 100, height: 80 });
    const b = createElement("rectangle", 100, 100, { width: 100, height: 80 });
    const c = createElement("rectangle", 150, 150, { width: 100, height: 80 });
    API.h.addElement(a);
    API.h.addElement(b);
    API.h.addElement(c);

    // Select C (index 2) and send backward one step
    API.setSelectedElements([c]);
    await page.scene.flush();

    const sendBackwardBtn = page.screen.getByLabelText("Send backward");
    await userEvent.click(sendBackwardBtn);
    await waitForPaint();

    const ids = API.elements.map((el) => el.id);
    expect(ids[0]).toBe(a.id);
    expect(ids[1]).toBe(c.id);
    expect(ids[2]).toBe(b.id);
  });

  it("element already at front stays unchanged", async () => {
    const page = await CanvasPage.create();

    const a = createElement("rectangle", 50, 50, { width: 100, height: 80 });
    const b = createElement("rectangle", 100, 100, { width: 100, height: 80 });
    API.h.addElement(a);
    API.h.addElement(b);

    // B is already at front
    API.setSelectedElements([b]);
    await page.scene.flush();

    const orderBefore = API.elements.map((el) => el.id);

    const bringToFrontBtn = page.screen.getByLabelText("Bring to front");
    await userEvent.click(bringToFrontBtn);
    await waitForPaint();

    const orderAfter = API.elements.map((el) => el.id);
    expect(orderAfter).toEqual(orderBefore);
  });

  it("layer order change is undoable", async () => {
    const page = await CanvasPage.create();

    const a = createElement("rectangle", 50, 50, { width: 100, height: 80 });
    const b = createElement("rectangle", 100, 100, { width: 100, height: 80 });
    API.h.addElement(a);
    API.h.addElement(b);

    const originalOrder = API.elements.map((el) => el.id);

    // Select A, bring to front via button (action registry wraps in recordAction)
    API.setSelectedElements([a]);
    await page.scene.flush();

    const bringToFrontBtn = page.screen.getByLabelText("Bring to front");
    await userEvent.click(bringToFrontBtn);
    await waitForPaint();

    const afterOrder = API.elements.map((el) => el.id);
    expect(afterOrder).not.toEqual(originalOrder);

    // Undo should restore the original order
    const undoBtn = page.screen.getByRole("button", { name: "Undo" });
    await undoBtn.click();
    await waitForPaint();

    const undoneOrder = API.elements.map((el) => el.id);
    expect(undoneOrder).toEqual(originalOrder);
  });
});
