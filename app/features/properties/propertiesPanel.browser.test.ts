import { API, CanvasPage, waitForPaint } from "~/__test-utils__/browser";
import { createElement } from "~/features/elements/createElement";

/**
 * Helper: add an element programmatically, select it, and flush.
 * Returns the created element.
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

describe("PropertiesPanel visibility", () => {
  it("shows all property groups for a rectangle", async () => {
    const page = await CanvasPage.create();
    await addAndSelect(page, "rectangle");

    // Colors visible
    await expect.element(page.screen.getByText("Stroke")).toBeVisible();
    await expect.element(page.screen.getByLabelText("Stroke color")).toBeVisible();
    await expect.element(page.screen.getByLabelText("Background color")).toBeVisible();

    // Style group visible
    await expect.element(page.screen.getByText("Style")).toBeVisible();
    await expect.element(page.screen.getByText("Width")).toBeVisible();
    await expect.element(page.screen.getByText("Dash")).toBeVisible();

    // Shape group visible
    await expect.element(page.screen.getByText("Shape")).toBeVisible();
    await expect.element(page.screen.getByText("Rough")).toBeVisible();
    await expect.element(page.screen.getByText("Edges")).toBeVisible();

    // Opacity always visible
    await expect.element(page.screen.getByText("Opacity")).toBeVisible();

    // Bottom bar always visible
    await expect.element(page.screen.getByLabelText("Send to back")).toBeVisible();
    await expect.element(page.screen.getByLabelText("Duplicate")).toBeVisible();
    await expect.element(page.screen.getByLabelText("Delete")).toBeVisible();
  });

  it("shows only edges, opacity, layers, and actions for an image", async () => {
    const page = await CanvasPage.create();
    await addAndSelect(page, "image", {
      fileId: "test-file",
      status: "saved",
    });

    // Colors should NOT be visible
    await expect.element(page.screen.getByLabelText("Stroke color")).not.toBeInTheDocument();
    await expect.element(page.screen.getByLabelText("Background color")).not.toBeInTheDocument();

    // Style group should NOT be visible
    await expect.element(page.screen.getByText("Style")).not.toBeInTheDocument();

    // Shape group visible (only Edges, not Rough)
    await expect.element(page.screen.getByText("Shape")).toBeVisible();
    await expect.element(page.screen.getByText("Edges")).toBeVisible();
    await expect.element(page.screen.getByText("Rough")).not.toBeInTheDocument();

    // Opacity always visible
    await expect.element(page.screen.getByText("Opacity")).toBeVisible();

    // Bottom bar always visible
    await expect.element(page.screen.getByLabelText("Send to back")).toBeVisible();
    await expect.element(page.screen.getByLabelText("Duplicate")).toBeVisible();
  });

  it("shows text controls only when text is selected", async () => {
    const page = await CanvasPage.create();
    await addAndSelect(page, "text", { text: "Hello", originalText: "Hello" });

    // Text section visible
    await expect.element(page.screen.getByText("Text")).toBeVisible();
    await expect.element(page.screen.getByLabelText("Font size")).toBeVisible();

    // Stroke color visible for text
    await expect.element(page.screen.getByLabelText("Stroke color")).toBeVisible();

    // Background NOT visible for text
    await expect.element(page.screen.getByLabelText("Background color")).not.toBeInTheDocument();

    // Style group NOT visible for text (no fill, width, dash)
    await expect.element(page.screen.getByText("Style")).not.toBeInTheDocument();

    // Shape group NOT visible for text
    await expect.element(page.screen.getByText("Shape")).not.toBeInTheDocument();
  });

  it("shows arrowhead controls only when arrow is selected", async () => {
    const page = await CanvasPage.create();

    // Draw an arrow via UI
    const arrow = await page.canvas.createElement("arrow", [2, 2], [6, 5]);
    page.selection.expectSelected(arrow.id);

    // Arrowheads section visible
    await expect.element(page.screen.getByText("Arrowheads")).toBeVisible();

    // Text section NOT visible
    await expect.element(page.screen.getByText("Text")).not.toBeInTheDocument();
  });

  it("shows ellipse properties: colors, style, roughness — but NOT edges", async () => {
    const page = await CanvasPage.create();
    await addAndSelect(page, "ellipse");

    // Colors visible
    await expect.element(page.screen.getByLabelText("Stroke color")).toBeVisible();
    await expect.element(page.screen.getByLabelText("Background color")).toBeVisible();

    // Style group visible
    await expect.element(page.screen.getByText("Style")).toBeVisible();

    // Shape group visible (roughness yes, edges no)
    await expect.element(page.screen.getByText("Shape")).toBeVisible();
    await expect.element(page.screen.getByText("Rough")).toBeVisible();
    await expect.element(page.screen.getByText("Edges")).not.toBeInTheDocument();
  });

  it("shows superset of properties for mixed selection (rectangle + image)", async () => {
    const page = await CanvasPage.create();

    const rect = createElement("rectangle", 50, 50, { width: 100, height: 80 });
    const img = createElement("image", 200, 50, {
      width: 100,
      height: 80,
      fileId: "test-file",
      status: "saved",
    });
    API.h.addElement(rect);
    API.h.addElement(img);
    API.setSelectedElements([rect, img]);
    await page.scene.flush();

    // Colors visible (rectangle has stroke + background)
    await expect.element(page.screen.getByLabelText("Stroke color")).toBeVisible();
    await expect.element(page.screen.getByLabelText("Background color")).toBeVisible();

    // Style group visible (rectangle has fill, width, dash)
    await expect.element(page.screen.getByText("Style")).toBeVisible();

    // Shape group visible (both have some: roughness from rect, edges from both)
    await expect.element(page.screen.getByText("Shape")).toBeVisible();
    await expect.element(page.screen.getByText("Rough")).toBeVisible();
    await expect.element(page.screen.getByText("Edges")).toBeVisible();

    // Opacity always visible
    await expect.element(page.screen.getByText("Opacity")).toBeVisible();
  });

  it("hides all panels when nothing is selected", async () => {
    const page = await CanvasPage.create();

    // No elements, no selection — panel should not render at all
    await expect.element(page.screen.getByText("Opacity")).not.toBeInTheDocument();
  });

  it("panel appears on selection and disappears on deselection", async () => {
    const page = await CanvasPage.create();

    const rect = await page.canvas.createElement("rectangle", [2, 2], [5, 5]);
    page.selection.expectSelected(rect.id);

    // Panel should be visible
    await expect.element(page.screen.getByText("Opacity")).toBeVisible();

    // Click on empty space to deselect
    await page.canvas.click([10, 8]);
    await waitForPaint();

    page.selection.expectNoneSelected();
    await expect.element(page.screen.getByText("Opacity")).not.toBeInTheDocument();
  });

  it("arrow shows stroke color but NOT background color", async () => {
    const page = await CanvasPage.create();

    const arrow = await page.canvas.createElement("arrow", [1, 1], [7, 5]);
    page.selection.expectSelected(arrow.id);

    // Stroke color visible for arrows
    await expect.element(page.screen.getByLabelText("Stroke color")).toBeVisible();

    // Background NOT visible for arrows
    await expect.element(page.screen.getByLabelText("Background color")).not.toBeInTheDocument();

    // Style group visible (width, dash — but NOT fill)
    await expect.element(page.screen.getByText("Style")).toBeVisible();
    await expect.element(page.screen.getByText("Width")).toBeVisible();
    await expect.element(page.screen.getByText("Dash")).toBeVisible();

    // Fill style row specifically is hidden for arrows
    const fillLabels = page.screen.getByText("Fill");
    await expect.element(fillLabels).not.toBeInTheDocument();
  });
});
