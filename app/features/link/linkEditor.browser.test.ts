import { userEvent } from "vitest/browser";
import { TestDrawVue, waitForPaint } from "~/__test-utils__/browser";

describe("link editor (Cmd+K)", () => {
  it("opens with Cmd+K when one element is selected", async () => {
    const td = await TestDrawVue.create();
    const el = await td.createElement("rectangle", [2, 2], [5, 5]);
    td.select(el.get());
    await waitForPaint();

    await td.keyboard.withModifierKeys({ metaKey: true }, async () => {
      await td.keyPress("k");
    });
    await waitForPaint();

    const input = td.screen.getByPlaceholder("https://...");
    await expect.element(input).toBeVisible();
  });

  it("does not open when nothing is selected", async () => {
    const td = await TestDrawVue.create();
    await td.createElement("rectangle", [2, 2], [5, 5]);
    td.clearSelection();
    await waitForPaint();

    await td.keyboard.withModifierKeys({ metaKey: true }, async () => {
      await td.keyPress("k");
    });
    await waitForPaint();

    const input = td.screen.getByPlaceholder("https://...");
    await expect.element(input).not.toBeInTheDocument();
  });

  it("does not open when multiple elements are selected", async () => {
    const td = await TestDrawVue.create();
    const r1 = await td.createElement("rectangle", [1, 1], [3, 3]);
    const r2 = await td.createElement("rectangle", [5, 5], [7, 7]);
    td.select(r1.get(), r2.get());
    await waitForPaint();

    await td.keyboard.withModifierKeys({ metaKey: true }, async () => {
      await td.keyPress("k");
    });
    await waitForPaint();

    const input = td.screen.getByPlaceholder("https://...");
    await expect.element(input).not.toBeInTheDocument();
  });

  it("adds a link to an element via Enter", async () => {
    const td = await TestDrawVue.create();
    const el = await td.createElement("rectangle", [2, 2], [5, 5]);
    td.select(el.get());
    await waitForPaint();

    // Open link editor
    await td.keyboard.withModifierKeys({ metaKey: true }, async () => {
      await td.keyPress("k");
    });
    await waitForPaint();

    // Type a URL and press Enter
    const input = td.screen.getByPlaceholder("https://...");
    await userEvent.fill(input, "https://example.com");
    await userEvent.keyboard("{Enter}");
    await waitForPaint();

    // Element should now have the link
    expect(el.get().link).toBe("https://example.com");

    // Editor should be closed
    await expect.element(input).not.toBeInTheDocument();
  });

  it("closes without saving on Escape", async () => {
    const td = await TestDrawVue.create();
    const el = await td.createElement("rectangle", [2, 2], [5, 5]);
    td.select(el.get());
    await waitForPaint();

    // Open link editor
    await td.keyboard.withModifierKeys({ metaKey: true }, async () => {
      await td.keyPress("k");
    });
    await waitForPaint();

    // Type a URL but press Escape
    const input = td.screen.getByPlaceholder("https://...");
    await userEvent.fill(input, "https://should-not-save.com");
    await userEvent.keyboard("{Escape}");
    await waitForPaint();

    // Element should NOT have a link
    expect(el.get().link).toBeNull();

    // Editor should be closed
    await expect.element(input).not.toBeInTheDocument();
  });

  it("shows existing link when editing element that has one", async () => {
    const td = await TestDrawVue.create();
    const el = td.addElement({ link: "https://existing.com" });
    td.select(el);
    await waitForPaint();

    await td.keyboard.withModifierKeys({ metaKey: true }, async () => {
      await td.keyPress("k");
    });
    await waitForPaint();

    const input = td.screen.getByPlaceholder("https://...");
    await expect.element(input).toHaveValue("https://existing.com");
  });

  it("does not show remove button when element has no link", async () => {
    const td = await TestDrawVue.create();
    const el = await td.createElement("rectangle", [2, 2], [5, 5]);
    td.select(el.get());
    await waitForPaint();

    await td.keyboard.withModifierKeys({ metaKey: true }, async () => {
      await td.keyPress("k");
    });
    await waitForPaint();

    const removeBtn = td.screen.getByLabelText("Remove link");
    await expect.element(removeBtn).not.toBeInTheDocument();
  });

  it("shows remove button when element has an existing link", async () => {
    const td = await TestDrawVue.create();
    const elWithLink = td.addElement({ link: "https://example.com" });
    td.select(elWithLink);
    await waitForPaint();

    await td.keyboard.withModifierKeys({ metaKey: true }, async () => {
      await td.keyPress("k");
    });
    await waitForPaint();

    const removeBtnVisible = td.screen.getByLabelText("Remove link");
    await expect.element(removeBtnVisible).toBeVisible();
  });

  it("removes an existing link via the remove button", async () => {
    const td = await TestDrawVue.create();
    const el = td.addElement({ x: 200, y: 200, link: "https://remove-me.com" });
    td.select(el);
    await waitForPaint();

    await td.keyboard.withModifierKeys({ metaKey: true }, async () => {
      await td.keyPress("k");
    });
    await waitForPaint();

    // Click the remove button (UButton renders as <div> in test stubs, use getByLabelText)
    const removeBtn = td.screen.getByLabelText("Remove link");
    await userEvent.click(removeBtn);
    await waitForPaint();

    // Link should be removed
    expect(td.getElement(el.id).link).toBeNull();

    // Editor should be closed
    const input = td.screen.getByPlaceholder("https://...");
    await expect.element(input).not.toBeInTheDocument();
  });

  it("link addition is undoable", async () => {
    const td = await TestDrawVue.create();
    const el = await td.createElement("rectangle", [2, 2], [5, 5]);
    td.select(el.get());
    await waitForPaint();

    // Add a link
    await td.keyboard.withModifierKeys({ metaKey: true }, async () => {
      await td.keyPress("k");
    });
    await waitForPaint();

    const input = td.screen.getByPlaceholder("https://...");
    await userEvent.fill(input, "https://undoable.com");
    await userEvent.keyboard("{Enter}");
    await waitForPaint();

    expect(el.get().link).toBe("https://undoable.com");

    // Undo
    await td.undo();
    await waitForPaint();

    expect(el.get().link).toBeNull();
  });

  it("link removal is undoable", async () => {
    const td = await TestDrawVue.create();
    const el = td.addElement({ x: 200, y: 200, link: "https://restore-me.com" });
    td.select(el);
    await waitForPaint();

    // Open editor and remove
    await td.keyboard.withModifierKeys({ metaKey: true }, async () => {
      await td.keyPress("k");
    });
    await waitForPaint();

    const removeBtn = td.screen.getByLabelText("Remove link");
    await userEvent.click(removeBtn);
    await waitForPaint();

    expect(td.getElement(el.id).link).toBeNull();

    // Undo should restore the link
    await td.undo();
    await waitForPaint();

    expect(td.getElement(el.id).link).toBe("https://restore-me.com");
  });

  it("link button in properties panel opens editor", async () => {
    const td = await TestDrawVue.create();
    const el = await td.createElement("rectangle", [2, 2], [5, 5]);
    td.select(el.get());
    await waitForPaint();

    // Click the link button in properties panel
    const linkBtn = td.screen.getByLabelText("Edit Link");
    await expect.element(linkBtn).toBeVisible();
    await userEvent.click(linkBtn);
    await waitForPaint();

    const input = td.screen.getByPlaceholder("https://...");
    await expect.element(input).toBeVisible();
  });

  it("link button is highlighted when element has a link", async () => {
    const td = await TestDrawVue.create();
    const el = td.addElement({ link: "https://highlighted.com" });
    td.select(el);
    await waitForPaint();

    const linkBtn = td.screen.getByLabelText("Edit Link");
    await expect.element(linkBtn).toHaveAttribute("aria-pressed", "true");
  });

  it("edits an existing link to a new value", async () => {
    const td = await TestDrawVue.create();
    const el = td.addElement({ link: "https://old-link.com" });
    td.select(el);
    await waitForPaint();

    await td.keyboard.withModifierKeys({ metaKey: true }, async () => {
      await td.keyPress("k");
    });
    await waitForPaint();

    const input = td.screen.getByPlaceholder("https://...");
    await userEvent.clear(input);
    await userEvent.fill(input, "https://new-link.com");
    await userEvent.keyboard("{Enter}");
    await waitForPaint();

    expect(td.getElement(el.id).link).toBe("https://new-link.com");
  });

  it("prepends https:// when entering URL without protocol", async () => {
    const td = await TestDrawVue.create();
    const el = await td.createElement("rectangle", [2, 2], [5, 5]);
    td.select(el.get());
    await waitForPaint();

    await td.keyboard.withModifierKeys({ metaKey: true }, async () => {
      await td.keyPress("k");
    });
    await waitForPaint();

    const input = td.screen.getByPlaceholder("https://...");
    await userEvent.fill(input, "example.com");
    await userEvent.keyboard("{Enter}");
    await waitForPaint();

    expect(el.get().link).toBe("https://example.com");
  });

  it("saves the link when clicking outside the editor", async () => {
    const td = await TestDrawVue.create();
    const el = await td.createElement("rectangle", [2, 2], [5, 5]);
    td.select(el.get());
    await waitForPaint();

    await td.keyboard.withModifierKeys({ metaKey: true }, async () => {
      await td.keyPress("k");
    });
    await waitForPaint();

    const input = td.screen.getByPlaceholder("https://...");
    await userEvent.fill(input, "https://click-outside.com");

    // Click outside the popover on the canvas
    await td.click([0, 0]);
    await waitForPaint();

    expect(el.get().link).toBe("https://click-outside.com");
  });
});
