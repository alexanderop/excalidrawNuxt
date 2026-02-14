import { onTestFinished } from "vitest";
import { userEvent } from "vitest/browser";
import { CanvasPage, API, waitForPaint } from "~/__test-utils__/browser";

/** Toggle dark mode via Alt+Shift+D and wait for re-render. */
async function toggleDarkMode(): Promise<void> {
  await userEvent.keyboard("{Alt>}{Shift>}d{/Shift}{/Alt}");
  // Theme toggle triggers markAllDirty → RAF paint cycle
  await waitForPaint();
  await waitForPaint();
}

function cleanupDarkMode(): void {
  document.documentElement.classList.remove("dark");
  localStorage.removeItem("excalidraw-theme");
}

describe("dark mode rendering", () => {
  it("renders all element types in dark mode", async () => {
    const page = await CanvasPage.create();
    onTestFinished(() => cleanupDarkMode());

    // Row 1: Rectangle and Diamond
    await page.canvas.createElementAtCells("rectangle", [1, 1], [4, 3]);
    await page.canvas.createElementAtCells("diamond", [5, 1], [8, 3]);

    // Row 2: Ellipse and Arrow
    await page.canvas.createElementAtCells("ellipse", [1, 4], [4, 6]);
    await page.canvas.createElementAtCells("arrow", [5, 5], [8, 5]);
    await waitForPaint();

    await toggleDarkMode();

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(API.elements).toHaveLength(4);
  });
});
