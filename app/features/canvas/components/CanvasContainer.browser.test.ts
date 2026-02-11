import { CanvasPage } from "~/__test-utils__/browser";

describe("CanvasContainer", () => {
  it("renders the interactive canvas", async () => {
    const page = await CanvasPage.create();
    const canvas = page.screen.getByTestId("interactive-canvas");
    await expect.element(canvas).toBeVisible();
  });

  it("renders the drawing toolbar with expected tool buttons", async () => {
    const page = await CanvasPage.create();
    const handBtn = page.screen.getByRole("button", { name: "Hand" });
    const selectionBtn = page.screen.getByRole("button", { name: "Selection" });
    const rectangleBtn = page.screen.getByRole("button", { name: "Rectangle" });
    const diamondBtn = page.screen.getByRole("button", { name: "Diamond" });
    const ellipseBtn = page.screen.getByRole("button", { name: "Ellipse" });
    const arrowBtn = page.screen.getByRole("button", { name: /^Arrow$/ });
    await expect.element(handBtn).toBeVisible();
    await expect.element(selectionBtn).toBeVisible();
    await expect.element(rectangleBtn).toBeVisible();
    await expect.element(diamondBtn).toBeVisible();
    await expect.element(ellipseBtn).toBeVisible();
    await expect.element(arrowBtn).toBeVisible();
  });

  // eslint-disable-next-line vitest/expect-expect -- assertion delegated to page.toolbar.expectActive
  it("defaults to selection tool being active", async () => {
    const page = await CanvasPage.create();
    await page.toolbar.expectActive("selection");
  });
});
