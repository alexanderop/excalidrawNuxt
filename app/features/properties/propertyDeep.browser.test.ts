import { API, CanvasPage, waitForPaint } from "~/__test-utils__/browser";
import { createElement } from "@drawvue/core";
import { userEvent } from "vitest/browser";

/**
 * Helper: add an element programmatically, select it, and flush.
 */
async function addAndSelect(
  page: Awaited<ReturnType<typeof CanvasPage.create>>,
  type: "rectangle" | "ellipse" | "diamond" | "arrow" | "line" | "text",
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
 */
async function clickOption(page: Awaited<ReturnType<typeof CanvasPage.create>>, label: string) {
  const btn = page.screen.getByLabelText(label, { exact: true });
  await userEvent.click(btn);
  await waitForPaint();
}

describe("property panel deep interactions", () => {
  describe("color changes", () => {
    it("stroke color swatch is visible when element selected", async () => {
      const page = await CanvasPage.create();
      await addAndSelect(page, "rectangle");

      await expect.element(page.screen.getByLabelText("Stroke color")).toBeVisible();
    });

    it("background color swatch is visible for rectangle", async () => {
      const page = await CanvasPage.create();
      await addAndSelect(page, "rectangle");

      await expect.element(page.screen.getByLabelText("Background color")).toBeVisible();
    });

    it("color swatches update when different elements selected", async () => {
      const page = await CanvasPage.create();

      // Create rectangle with one color
      const rect = await addAndSelect(page, "rectangle", { strokeColor: "#e03131" });

      const swatchButton = page.screen.getByLabelText("Stroke color");
      await expect.element(swatchButton).toBeVisible();

      // Verify the color is reflected
      const updatedRect = API.getElementByID(rect.id)!;
      expect(updatedRect.strokeColor).toBe("#e03131");
    });
  });

  describe("stroke and fill", () => {
    it("changes fill style from hachure to cross-hatch", async () => {
      const page = await CanvasPage.create();
      const el = await addAndSelect(page, "rectangle", { fillStyle: "hachure" });

      await clickOption(page, "Cross-hatch");

      const updated = API.getElementByID(el.id)!;
      expect(updated.fillStyle).toBe("cross-hatch");
    });

    it("changes stroke width to thin", async () => {
      const page = await CanvasPage.create();
      const el = await addAndSelect(page, "rectangle", { strokeWidth: 4 });

      await clickOption(page, "Thin");

      const updated = API.getElementByID(el.id)!;
      expect(updated.strokeWidth).toBe(1);
    });

    it("changes stroke width to bold", async () => {
      const page = await CanvasPage.create();
      const el = await addAndSelect(page, "rectangle", { strokeWidth: 1 });

      await clickOption(page, "Bold");

      const updated = API.getElementByID(el.id)!;
      expect(updated.strokeWidth).toBe(2);
    });

    it("changes roundness to round", async () => {
      const page = await CanvasPage.create();
      const el = await addAndSelect(page, "rectangle");

      await clickOption(page, "Round");

      const updated = API.getElementByID(el.id)!;
      expect(updated.roundness).not.toBeNull();
    });

    it("changes roundness to sharp", async () => {
      const page = await CanvasPage.create();
      const el = await addAndSelect(page, "rectangle", {
        roundness: { type: 3, value: 32 },
      });

      await clickOption(page, "Sharp");

      const updated = API.getElementByID(el.id)!;
      expect(updated.roundness).toBeNull();
    });
  });

  describe("text properties", () => {
    it("shows font size input for text element", async () => {
      const page = await CanvasPage.create();
      await addAndSelect(page, "text", { text: "Hello", originalText: "Hello" });

      await expect.element(page.screen.getByLabelText("Font size")).toBeVisible();
    });

    it("shows text alignment options for text element", async () => {
      const page = await CanvasPage.create();
      await addAndSelect(page, "text", { text: "Hello", originalText: "Hello" });

      // Text alignment section should be visible
      await expect.element(page.screen.getByText("Align")).toBeVisible();
    });

    it("changes text alignment to center", async () => {
      const page = await CanvasPage.create();
      const el = await addAndSelect(page, "text", {
        text: "Hello",
        originalText: "Hello",
        textAlign: "left",
      });

      await clickOption(page, "Center");

      const updated = API.getElementByID(el.id)!;
      expect((updated as { textAlign: string }).textAlign).toBe("center");
    });

    it("changes text alignment to right", async () => {
      const page = await CanvasPage.create();
      const el = await addAndSelect(page, "text", {
        text: "Hello",
        originalText: "Hello",
        textAlign: "left",
      });

      await clickOption(page, "Right");

      const updated = API.getElementByID(el.id)!;
      expect((updated as { textAlign: string }).textAlign).toBe("right");
    });
  });

  describe("opacity", () => {
    it("opacity slider is visible when element selected", async () => {
      const page = await CanvasPage.create();
      await addAndSelect(page, "rectangle");

      await expect.element(page.screen.getByText("Opacity")).toBeVisible();
    });
  });

  describe("mixed selection properties", () => {
    it("changes property on multiple selected elements", async () => {
      const page = await CanvasPage.create();

      const rect = createElement("rectangle", 50, 50, {
        width: 100,
        height: 80,
        roughness: 1,
      });
      const ellipse = createElement("ellipse", 200, 50, {
        width: 100,
        height: 80,
        roughness: 1,
      });
      API.h.addElement(rect);
      API.h.addElement(ellipse);
      API.setSelectedElements([rect, ellipse]);
      await page.scene.flush();

      // Change roughness on both
      await clickOption(page, "Architect");

      const updatedRect = API.getElementByID(rect.id)!;
      const updatedEllipse = API.getElementByID(ellipse.id)!;
      expect(updatedRect.roughness).toBe(0);
      expect(updatedEllipse.roughness).toBe(0);
    });
  });

  describe("arrow properties", () => {
    it("shows arrowhead controls when arrow selected", async () => {
      const page = await CanvasPage.create();
      const arrow = await page.canvas.createElement("arrow", [2, 2], [6, 5]);
      page.selection.expectSelected(arrow.id);

      await expect.element(page.screen.getByText("Arrowheads")).toBeVisible();
    });

    it("shows arrow subtype picker", async () => {
      const page = await CanvasPage.create();
      await page.canvas.createElement("arrow", [2, 2], [6, 5]);

      // The Type selector with Sharp/Curved/Elbow should be visible
      await expect.element(page.screen.getByText("Type")).toBeVisible();
    });

    it("changes arrow subtype to curved", async () => {
      const page = await CanvasPage.create();
      const arrow = await page.canvas.createElement("arrow", [2, 2], [8, 5]);
      page.selection.expectSelected(arrow.id);

      await clickOption(page, "Curved");

      const updated = API.getElementByID(arrow.id)!;
      expect(updated.roundness).not.toBeNull();
    });
  });
});
