import { API, CanvasPage, waitForPaint } from "~/__test-utils__/browser";
import { createElement } from "@drawvue/core";
import { userEvent } from "vitest/browser";

/**
 * Helper: add an element programmatically, select it, and flush.
 */
async function addAndSelect(
  page: Awaited<ReturnType<typeof CanvasPage.create>>,
  type: "rectangle" | "ellipse" | "diamond" | "arrow" | "line" | "text" | "image",
  overrides: Record<string, unknown> = {},
) {
  const el = createElement(type, 100, 100, {
    width: 200,
    height: 150,
    ...overrides,
  });
  API.h.addElement(el);
  API.setSelectedElements([el]);
  await page.scene.flush();
  return el;
}

/**
 * Click a ButtonIconSelect option by its exact aria-label.
 * UButton renders as <div> in test stubs, so we use getByLabelText with exact.
 */
async function clickOption(page: Awaited<ReturnType<typeof CanvasPage.create>>, label: string) {
  const btn = page.screen.getByLabelText(label, { exact: true });
  await userEvent.click(btn);
  await waitForPaint();
}

describe("property value changes via PropertiesPanel", () => {
  it("changes stroke width to extra bold", async () => {
    const page = await CanvasPage.create();
    const el = await addAndSelect(page, "rectangle", { strokeWidth: 1 });

    expect(el.strokeWidth).toBe(1);

    await clickOption(page, "Extra bold");

    const updated = API.getElementByID(el.id)!;
    expect(updated.strokeWidth).toBe(4);
  });

  it("changes stroke style to dashed", async () => {
    const page = await CanvasPage.create();
    const el = await addAndSelect(page, "rectangle", { strokeStyle: "solid" });

    await clickOption(page, "Dashed");

    const updated = API.getElementByID(el.id)!;
    expect(updated.strokeStyle).toBe("dashed");
  });

  it("changes fill style to cross-hatch", async () => {
    const page = await CanvasPage.create();
    const el = await addAndSelect(page, "rectangle", { fillStyle: "hachure" });

    await clickOption(page, "Cross-hatch");

    const updated = API.getElementByID(el.id)!;
    expect(updated.fillStyle).toBe("cross-hatch");
  });

  it("changes roughness to architect (0)", async () => {
    const page = await CanvasPage.create();
    const el = await addAndSelect(page, "rectangle", { roughness: 1 });

    await clickOption(page, "Architect");

    const updated = API.getElementByID(el.id)!;
    expect(updated.roughness).toBe(0);
  });

  it("changes stroke style to dotted", async () => {
    const page = await CanvasPage.create();
    const el = await addAndSelect(page, "rectangle", { strokeStyle: "solid" });

    await clickOption(page, "Dotted");

    const updated = API.getElementByID(el.id)!;
    expect(updated.strokeStyle).toBe("dotted");
  });

  it("changes roughness to cartoonist (2)", async () => {
    const page = await CanvasPage.create();
    const el = await addAndSelect(page, "rectangle", { roughness: 1 });

    await clickOption(page, "Cartoonist");

    const updated = API.getElementByID(el.id)!;
    expect(updated.roughness).toBe(2);
  });

  it("mixed selection updates both elements", async () => {
    const page = await CanvasPage.create();

    const rect = createElement("rectangle", 50, 50, {
      width: 100,
      height: 80,
      strokeWidth: 1,
    });
    const ellipse = createElement("ellipse", 200, 50, {
      width: 100,
      height: 80,
      strokeWidth: 4,
    });
    API.h.addElement(rect);
    API.h.addElement(ellipse);
    API.setSelectedElements([rect, ellipse]);
    await page.scene.flush();

    // Click Extra bold (strokeWidth: 4) — unique label
    await clickOption(page, "Extra bold");

    const updatedRect = API.getElementByID(rect.id)!;
    const updatedEllipse = API.getElementByID(ellipse.id)!;
    expect(updatedRect.strokeWidth).toBe(4);
    expect(updatedEllipse.strokeWidth).toBe(4);
  });
});
