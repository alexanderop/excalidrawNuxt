import { page, userEvent } from "vitest/browser";
import { CanvasPage } from "~/__test-utils__/browser";
import { waitForPaint } from "~/__test-utils__/browser/waiters";

describe("code tool rendering", () => {
  it("renders a code element with syntax-highlighted TypeScript", async () => {
    const cp = await CanvasPage.create();

    // Activate code tool with 'c' shortcut
    await cp.toolbar.select("code");
    await cp.toolbar.expectActive("code");

    // Click on canvas to create a code element — opens inline editor
    await cp.canvas.pointer.clickAt(200, 200);

    // Editor should open with a textarea
    const textarea = cp.screen.getByRole("textbox");
    await expect.element(textarea).toBeVisible();

    // Type TypeScript code into the editor
    const code = "function greet(name: string): string {\n  return `Hello, ${name}!`\n}";
    await userEvent.fill(textarea, code);
    await expect.element(textarea).toHaveValue(code);

    // Submit with Escape to close editor and render on canvas
    await userEvent.keyboard("{Escape}");

    // Wait for editor to close
    await expect
      .poll(() => {
        // eslint-disable-next-line no-restricted-syntax -- need raw DOM check after element removal
        return document.querySelector("textarea");
      })
      .toBeNull();

    // Wait for canvas to repaint with the code element
    await waitForPaint();
    // Extra frame for Shiki async highlighting
    await waitForPaint();

    await expect(page.getByTestId("canvas-container")).toMatchScreenshot("code-element-typescript");
  });
});
