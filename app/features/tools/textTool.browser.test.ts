import { userEvent } from "vitest/browser";
import { CanvasPage, API } from "~/__test-utils__/browser";

describe("text tool interaction", () => {
  it("opens editor on single click with text tool (like Excalidraw)", async () => {
    const cp = await CanvasPage.create();

    // Press 't' to activate text tool
    await cp.toolbar.select("text");
    await cp.toolbar.expectActive("text");

    // Single click on canvas — editor should open immediately (no double-click needed)
    await cp.canvas.pointer.clickAt(400, 300);

    // A textarea should now be visible — this is the inline text editor
    const textarea = cp.screen.getByRole("textbox");
    await expect.element(textarea).toBeVisible();

    // Type text into the editor
    await userEvent.fill(textarea, "Hello World");
    await expect.element(textarea).toHaveValue("Hello World");

    // Submit with Escape
    await userEvent.keyboard("{Escape}");

    // Textarea should be removed after submit
    await expect
      .poll(() => {
        // eslint-disable-next-line no-restricted-syntax -- need raw DOM check after element removal
        return document.querySelector("textarea");
      })
      .toBeNull();

    // Text element exists in scene
    expect(API.elements).toHaveLength(1);
    expect(API.elements[0]!.type).toBe("text");
  });

  // eslint-disable-next-line vitest/expect-expect -- assertion delegated to page.toolbar.expectActive
  it("switches to selection tool after opening text editor", async () => {
    const cp = await CanvasPage.create();

    // Activate text tool and click canvas
    await cp.toolbar.select("text");
    await cp.canvas.pointer.clickAt(400, 300);

    // Tool should have switched to selection while editor is open
    await cp.toolbar.expectActive("selection");
  });

  it("textarea grows in width as user types long text", async () => {
    const cp = await CanvasPage.create();

    // Activate text tool and click to open editor
    await cp.toolbar.select("text");
    await cp.canvas.pointer.clickAt(200, 300);

    const textarea = cp.screen.getByRole("textbox");
    await expect.element(textarea).toBeVisible();

    // Type character by character (realistic typing, not fill) to test dynamic resize
    await userEvent.type(textarea, "hello how are you doing today my friend");

    // 1. The textarea must have grown — its offsetWidth should be much larger than the initial min-width (1ch ≈ 8-10px)
    await expect
      .poll(
        () => {
          // eslint-disable-next-line no-restricted-syntax -- need raw DOM access for width measurement
          const ta = document.querySelector("textarea");
          if (!ta) return 0;
          return ta.offsetWidth;
        },
        { timeout: 2000 },
      )
      .toBeGreaterThan(100);

    // 2. No overflow — scrollWidth must not exceed clientWidth (text is not clipped)
    await expect
      .poll(() => {
        // eslint-disable-next-line no-restricted-syntax -- need raw DOM access for scroll measurement
        const ta = document.querySelector("textarea");
        if (!ta) return false;
        return ta.scrollWidth <= ta.clientWidth;
      })
      .toBe(true);
  });

  it("deletes empty text element on submit", async () => {
    const cp = await CanvasPage.create();

    // Create text editor with single click
    await cp.toolbar.select("text");
    await cp.canvas.pointer.clickAt(400, 300);

    // Editor opens
    const textarea = cp.screen.getByRole("textbox");
    await expect.element(textarea).toBeVisible();

    // Submit without typing anything — element should be deleted
    await userEvent.keyboard("{Escape}");
    await expect
      .poll(() => {
        // eslint-disable-next-line no-restricted-syntax -- need raw DOM check after element removal
        return document.querySelector("textarea");
      })
      .toBeNull();
  });
});
