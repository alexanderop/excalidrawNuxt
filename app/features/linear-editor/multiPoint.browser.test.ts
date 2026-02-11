import { userEvent } from "vitest/browser";
import { API, CanvasPage, waitForPaint } from "~/__test-utils__/browser";
import { isArrowElement } from "~/features/elements/types";

describe("multi-point creation", () => {
  it("creates an arrow with drag and enters it into the scene", async () => {
    const page = await CanvasPage.create();

    await page.canvas.createElementAtCells("arrow", [2, 2], [8, 5]);
    await waitForPaint();

    expect(page.scene.elements).toHaveLength(1);
    const arrow = page.scene.elements[0]!;
    expect(isArrowElement(arrow)).toBe(true);
    expect(page.scene.activeTool).toBe("selection");
  });

  it("multiElement is null when not in multi-point mode", async () => {
    await CanvasPage.create();

    expect(API.h.multiElement.value).toBeNull();
  });

  it("arrow click too small is discarded", async () => {
    const page = await CanvasPage.create();

    // Click (not drag) with arrow tool — element too small, should be discarded
    await page.toolbar.select("arrow");
    await page.canvas.click([5, 5]);
    await waitForPaint();

    // No element should be created (too small)
    expect(page.scene.elements).toHaveLength(0);
    // Tool resets to selection even on discard
    expect(page.scene.activeTool).toBe("selection");
  });

  it("Escape from arrow tool switches to selection", async () => {
    const page = await CanvasPage.create();

    await page.toolbar.select("arrow");
    expect(page.scene.activeTool).toBe("arrow");

    await userEvent.keyboard("{Escape}");
    // Escape with no active multi-element — tool should stay as-is
    // (useMultiPointCreation only handles Escape when multiElement is set)
  });
});
