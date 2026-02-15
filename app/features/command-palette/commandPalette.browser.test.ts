import { userEvent } from "vitest/browser";
import { TestDrawVue } from "~/__test-utils__/browser";

async function openCommandPalette(td: TestDrawVue): Promise<void> {
  await td.keyboard.withModifierKeys({ ctrlKey: true }, () => td.keyboard.press("k"));
}

function getSearchInput(td: TestDrawVue) {
  return td.screen.getByPlaceholder("Search commands...");
}

describe("command palette", () => {
  it("opens with Ctrl+K", async () => {
    const td = await TestDrawVue.create();

    await openCommandPalette(td);

    await expect.element(getSearchInput(td)).toBeVisible();
  });

  it("toggles closed with Ctrl+K", async () => {
    const td = await TestDrawVue.create();

    await openCommandPalette(td);
    await expect.element(getSearchInput(td)).toBeVisible();

    await openCommandPalette(td);
    await expect.element(getSearchInput(td)).not.toBeInTheDocument();
  });

  it("closes with Escape", async () => {
    const td = await TestDrawVue.create();

    await openCommandPalette(td);
    await expect.element(getSearchInput(td)).toBeVisible();

    await td.keyPress("{Escape}");
    await expect.element(getSearchInput(td)).not.toBeInTheDocument();
  });

  it("filters commands by search text", async () => {
    const td = await TestDrawVue.create();

    await openCommandPalette(td);
    await userEvent.keyboard("rect");

    const rectangleItem = td.screen.getByRole("option", { name: /rectangle/i });
    await expect.element(rectangleItem).toBeVisible();
  });

  it("executes selected command and closes palette", async () => {
    const td = await TestDrawVue.create();
    td.expectToolToBe("selection");

    await openCommandPalette(td);
    await userEvent.keyboard("rect");

    const rectangleItem = td.screen.getByRole("option", { name: /rectangle/i });
    await userEvent.click(rectangleItem);

    await expect.element(getSearchInput(td)).not.toBeInTheDocument();
    td.expectToolToBe("rectangle");
  });
});
