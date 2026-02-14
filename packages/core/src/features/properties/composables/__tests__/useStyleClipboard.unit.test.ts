import { describe, it, expect, vi } from "vitest";
import { withDrawVue } from "../../../../__test-utils__/withDrawVue";
import { createTestElement } from "../../../../__test-utils__/factories/element";
import type { ExcalidrawElement } from "../../../elements/types";

describe("useStyleClipboard", () => {
  describe("hasStoredStyles", () => {
    it("is false initially", () => {
      using ctx = withDrawVue(() => ({}));
      expect(ctx.drawVue.styleClipboard.hasStoredStyles.value).toBe(false);
    });

    it("is true after copyStyles", () => {
      using ctx = withDrawVue(() => ({}));
      const el = createTestElement({ id: "a", strokeColor: "#ff0000" });
      ctx.drawVue.styleClipboard.copyStyles(el);
      expect(ctx.drawVue.styleClipboard.hasStoredStyles.value).toBe(true);
    });
  });

  describe("copyStyles", () => {
    it("captures style properties from an element", () => {
      using ctx = withDrawVue(() => ({}));
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

      ctx.drawVue.styleClipboard.copyStyles(el);

      expect(ctx.drawVue.styleClipboard.storedStyles.value).toMatchObject({
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
      using ctx = withDrawVue(() => ({}));
      const el = createTestElement({ id: "b", x: 100, y: 200 });

      ctx.drawVue.styleClipboard.copyStyles(el);

      const snapshot = ctx.drawVue.styleClipboard.storedStyles.value!;
      expect(snapshot).not.toHaveProperty("id");
      expect(snapshot).not.toHaveProperty("x");
      expect(snapshot).not.toHaveProperty("y");
    });
  });

  describe("pasteStyles", () => {
    it("applies stored styles to elements", () => {
      using ctx = withDrawVue(() => ({}));
      const source = createTestElement({ id: "src", strokeColor: "#ff0000", opacity: 50 });
      const target = createTestElement({ id: "tgt", strokeColor: "#000000", opacity: 100 });
      const markDirty = vi.fn();

      ctx.drawVue.styleClipboard.copyStyles(source);
      ctx.drawVue.styleClipboard.pasteStyles([target], markDirty);

      expect(target.strokeColor).toBe("#ff0000");
      expect(target.opacity).toBe(50);
      expect(markDirty).toHaveBeenCalledOnce();
    });

    it("applies to multiple elements", () => {
      using ctx = withDrawVue(() => ({}));
      const source = createTestElement({ id: "src", strokeColor: "#ff0000" });
      const t1 = createTestElement({ id: "t1" });
      const t2 = createTestElement({ id: "t2" });
      const markDirty = vi.fn();

      ctx.drawVue.styleClipboard.copyStyles(source);
      ctx.drawVue.styleClipboard.pasteStyles([t1, t2], markDirty);

      expect(t1.strokeColor).toBe("#ff0000");
      expect(t2.strokeColor).toBe("#ff0000");
    });

    it("skips text-only properties on non-text elements", () => {
      using ctx = withDrawVue(() => ({}));
      const source = createTestElement({ id: "src" }) as unknown as Record<string, unknown>;
      source.fontFamily = 2;
      source.fontSize = 32;
      source.textAlign = "center";
      source.type = "text";

      ctx.drawVue.styleClipboard.copyStyles(source as unknown as ExcalidrawElement);

      const target = createTestElement({ id: "tgt" });
      const markDirty = vi.fn();
      ctx.drawVue.styleClipboard.pasteStyles([target], markDirty);

      expect((target as unknown as Record<string, unknown>).fontFamily).not.toBe(2);
      expect((target as unknown as Record<string, unknown>).fontSize).not.toBe(32);
      expect((target as unknown as Record<string, unknown>).textAlign).not.toBe("center");
    });

    it("does nothing when no styles are stored", () => {
      using ctx = withDrawVue(() => ({}));
      const target = createTestElement({ id: "tgt", strokeColor: "#000000" });
      const markDirty = vi.fn();

      ctx.drawVue.styleClipboard.pasteStyles([target], markDirty);

      expect(target.strokeColor).toBe("#000000");
      expect(markDirty).not.toHaveBeenCalled();
    });

    it("updates style defaults with pasted values", () => {
      using ctx = withDrawVue(() => ({}));
      const source = createTestElement({ id: "src", strokeColor: "#aabbcc", opacity: 75 });
      const target = createTestElement({ id: "tgt" });

      ctx.drawVue.styleClipboard.copyStyles(source);
      ctx.drawVue.styleClipboard.pasteStyles([target], vi.fn());

      expect(ctx.drawVue.styleDefaults.strokeColor.value).toBe("#aabbcc");
      expect(ctx.drawVue.styleDefaults.opacity.value).toBe(75);
    });
  });

  describe("isolation", () => {
    it("each context has independent state", () => {
      using a = withDrawVue(() => ({}));
      const el = createTestElement({ id: "x", strokeColor: "#123456" });
      a.drawVue.styleClipboard.copyStyles(el);

      using b = withDrawVue(() => ({}));
      expect(b.drawVue.styleClipboard.hasStoredStyles.value).toBe(false);
    });
  });
});
