import { TestDrawVue, waitForPaint } from "~/__test-utils__/browser";

describe("context menu", () => {
  it("shows canvas menu items on right-click on empty canvas", async () => {
    const td = await TestDrawVue.create();

    // Right-click on empty canvas area
    await td.rightClick([8, 4]);
    await waitForPaint();

    // Canvas menu should show "Paste" and "Select All" (registered actions)
    const pasteItem = td.screen.getByText("Paste");
    await expect.element(pasteItem).toBeVisible();

    const selectAllItem = td.screen.getByText("Select All");
    await expect.element(selectAllItem).toBeVisible();
  });

  it("shows element menu items on right-click on element", async () => {
    const td = await TestDrawVue.create();

    await td.createElement("rectangle", [3, 3], [6, 6]);

    // Right-click on the element
    await td.rightClick([4, 4]);
    await waitForPaint();

    // Element menu should show typical items
    const cutItem = td.screen.getByText("Cut");
    await expect.element(cutItem).toBeVisible();

    const copyItem = td.screen.getByRole("menuitem", { name: "Copy", exact: true });
    await expect.element(copyItem).toBeVisible();

    const deleteItem = td.screen.getByText("Delete");
    await expect.element(deleteItem).toBeVisible();
  });

  // eslint-disable-next-line vitest/expect-expect -- td.expectSelected wraps expect()
  it("auto-selects element on right-click if not already selected", async () => {
    const td = await TestDrawVue.create();

    const r = await td.createElement("rectangle", [3, 3], [6, 6]);

    // Click on empty area to deselect
    await td.click([12, 8]);
    await waitForPaint();
    td.expectNoneSelected();

    // Right-click on the element — should auto-select it
    await td.rightClick([4, 4]);
    await waitForPaint();

    td.expectSelected(r.id);
  });

  it("executes delete action from context menu", async () => {
    const td = await TestDrawVue.create();

    await td.createElement("rectangle", [3, 3], [6, 6]);
    td.expectElementCount(1);

    // Right-click on the element
    await td.rightClick([4, 4]);
    await waitForPaint();

    // Click the Delete menu item
    const deleteItem = td.screen.getByText("Delete");
    await expect.element(deleteItem).toBeVisible();
    await deleteItem.click();
    await waitForPaint();

    // Element should be deleted
    const visible = td.elements.filter((el) => !el.isDeleted);
    expect(visible).toHaveLength(0);
  });
});
