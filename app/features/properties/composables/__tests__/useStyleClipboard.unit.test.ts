import { describe, it, expect, vi } from "vitest";
import { useStyleClipboard } from "../useStyleClipboard";
import { useStyleDefaults } from "../useStyleDefaults";
import { withSetup } from "~/__test-utils__/withSetup";
import { createTestElement } from "~/__test-utils__/factories/element";
import type { ExcalidrawElement } from "~/features/elements/types";

function setup() {
  const clipboard = withSetup(() => useStyleClipboard());
  // Reset stored styles so each test starts clean (global state persists)
  clipboard.storedStyles.value = null;
  return clipboard;
}

describe("useStyleClipboard", () => {
  describe("hasStoredStyles", () => {
    it("is false initially", () => {
      const { hasStoredStyles } = setup();

      expect(hasStoredStyles.value).toBe(false);
    });

    it("is true after copyStyles", () => {
      const { copyStyles, hasStoredStyles } = setup();
      const el = createTestElement({ id: "a", strokeColor: "#ff0000" });

      copyStyles(el);

      expect(hasStoredStyles.value).toBe(true);
    });
  });

  describe("copyStyles", () => {
    it("captures style properties from an element", () => {
      const { copyStyles, storedStyles } = setup();
      const el = createTestElement({
        id: "a",
        strokeColor: "#ff0000",
        backgroundColor: "#00ff00",
        fillStyle: "solid",
        strokeWidth: 4,
        strokeStyle: "dashed",
        opacity: 50,
        roughness: 2,
      });

      copyStyles(el);

      expect(storedStyles.value).toMatchObject({
        strokeColor: "#ff0000",
        backgroundColor: "#00ff00",
        fillStyle: "solid",
        strokeWidth: 4,
        strokeStyle: "dashed",
        opacity: 50,
        roughness: 2,
      });
    });

    it("does not capture non-style properties like id, x, y", () => {
      const { copyStyles, storedStyles } = setup();
      const el = createTestElement({ id: "b", x: 100, y: 200 });

      copyStyles(el);

      const snapshot = storedStyles.value!;
      expect(snapshot).not.toHaveProperty("id");
      expect(snapshot).not.toHaveProperty("x");
      expect(snapshot).not.toHaveProperty("y");
    });
  });

  describe("pasteStyles", () => {
    it("applies stored styles to elements", () => {
      const { copyStyles, pasteStyles } = setup();
      const source = createTestElement({ id: "src", strokeColor: "#ff0000", opacity: 50 });
      const target = createTestElement({ id: "tgt", strokeColor: "#000000", opacity: 100 });
      const markDirty = vi.fn();

      copyStyles(source);
      pasteStyles([target], markDirty);

      expect(target.strokeColor).toBe("#ff0000");
      expect(target.opacity).toBe(50);
      expect(markDirty).toHaveBeenCalledOnce();
    });

    it("applies to multiple elements", () => {
      const { copyStyles, pasteStyles } = setup();
      const source = createTestElement({ id: "src", strokeColor: "#ff0000" });
      const t1 = createTestElement({ id: "t1" });
      const t2 = createTestElement({ id: "t2" });
      const markDirty = vi.fn();

      copyStyles(source);
      pasteStyles([t1, t2], markDirty);

      expect(t1.strokeColor).toBe("#ff0000");
      expect(t2.strokeColor).toBe("#ff0000");
    });

    it("skips text-only properties on non-text elements", () => {
      const { copyStyles, pasteStyles } = setup();
      // Create a text-like source element with font properties
      const source = createTestElement({ id: "src" }) as unknown as Record<string, unknown>;
      source.fontFamily = 2;
      source.fontSize = 32;
      source.textAlign = "center";
      source.type = "text";

      copyStyles(source as unknown as ExcalidrawElement);

      const target = createTestElement({ id: "tgt" });
      const markDirty = vi.fn();
      pasteStyles([target], markDirty);

      // Rectangle should NOT have font properties applied
      expect((target as unknown as Record<string, unknown>).fontFamily).not.toBe(2);
      expect((target as unknown as Record<string, unknown>).fontSize).not.toBe(32);
      expect((target as unknown as Record<string, unknown>).textAlign).not.toBe("center");
    });

    it("does nothing when no styles are stored", () => {
      const { pasteStyles } = setup();
      const target = createTestElement({ id: "tgt", strokeColor: "#000000" });
      const markDirty = vi.fn();

      pasteStyles([target], markDirty);

      expect(target.strokeColor).toBe("#000000");
      expect(markDirty).not.toHaveBeenCalled();
    });

    it("updates style defaults with pasted values", () => {
      const { copyStyles, pasteStyles } = setup();
      const defaults = withSetup(() => useStyleDefaults());
      const source = createTestElement({ id: "src", strokeColor: "#aabbcc", opacity: 75 });
      const target = createTestElement({ id: "tgt" });

      copyStyles(source);
      pasteStyles([target], vi.fn());

      expect(defaults.strokeColor.value).toBe("#aabbcc");
      expect(defaults.opacity.value).toBe(75);
    });
  });

  describe("singleton behavior", () => {
    it("shares state across multiple calls", () => {
      const first = setup();
      const el = createTestElement({ id: "x", strokeColor: "#123456" });
      first.copyStyles(el);

      // Access the global state directly without resetting
      const second = withSetup(() => useStyleClipboard());
      expect(second.hasStoredStyles.value).toBe(true);
      expect(second.storedStyles.value).toMatchObject({ strokeColor: "#123456" });
    });
  });
});
