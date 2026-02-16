import { TestDrawVue, waitForPaint } from "~/__test-utils__/browser";

describe("command palette", () => {
  it("opens with Cmd+K", async () => {
    const td = await TestDrawVue.create();

    await td.keyboard.withModifierKeys({ metaKey: true }, async () => {
      await td.keyPress("k");
    });
    await waitForPaint();

    const modal = td.screen.getByRole("dialog");
    await expect.element(modal).toBeVisible();
  });

  it("closes with Escape", async () => {
    const td = await TestDrawVue.create();

    // Open
    await td.keyboard.withModifierKeys({ metaKey: true }, async () => {
      await td.keyPress("k");
    });
    await waitForPaint();
    await expect.element(td.screen.getByRole("dialog")).toBeVisible();

    // Close with Escape
    await td.keyPress("{Escape}");
    await waitForPaint();

    await expect.element(td.screen.getByRole("dialog")).not.toBeInTheDocument();
  });

  it("toggles closed with Cmd+K when open", async () => {
    const td = await TestDrawVue.create();

    // Open
    await td.keyboard.withModifierKeys({ metaKey: true }, async () => {
      await td.keyPress("k");
    });
    await waitForPaint();
    await expect.element(td.screen.getByRole("dialog")).toBeVisible();

    // Toggle closed
    await td.keyboard.withModifierKeys({ metaKey: true }, async () => {
      await td.keyPress("k");
    });
    await waitForPaint();

    await expect.element(td.screen.getByRole("dialog")).not.toBeInTheDocument();
  });

  it("executes tool switch command and closes palette", async () => {
    const td = await TestDrawVue.create();
    td.expectToolToBe("selection");

    // Open palette
    await td.keyboard.withModifierKeys({ metaKey: true }, async () => {
      await td.keyPress("k");
    });
    await waitForPaint();

    // Find and click the Rectangle command
    const rectItem = td.screen.getByText("Rectangle");
    await expect.element(rectItem).toBeVisible();
    await rectItem.click();
    await waitForPaint();

    // Tool should have changed
    td.expectToolToBe("rectangle");

    // Modal should be closed
    await expect.element(td.screen.getByRole("dialog")).not.toBeInTheDocument();
  });
});
