import { describe, it, expect, vi } from "vitest";
import { computed, ref } from "vue";
import { usePropertyActions } from "../usePropertyActions";
import { withDrawVue } from "../../../../__test-utils__/withDrawVue";
import {
  createTestElement,
  createTestArrowElement,
} from "../../../../__test-utils__/factories/element";
import type { ExcalidrawElement } from "../../../elements/types";

function setup(elements: ExcalidrawElement[] = []) {
  const ctx = withDrawVue(() => ({}));
  const elementsRef = ref(elements);
  const selectedElements = computed(() => elementsRef.value);
  const markDirty = vi.fn();

  const actions = usePropertyActions({
    selectedElements,
    styleDefaults: ctx.drawVue.styleDefaults,
    markDirty,
  });

  return { actions, styleDefaults: ctx.drawVue.styleDefaults, markDirty, elementsRef, ctx };
}

describe("usePropertyActions", () => {
  describe("changeStrokeColor", () => {
    it("mutates selected elements and updates defaults", () => {
      const el = createTestElement({ id: "a" });
      const { actions, styleDefaults, markDirty } = setup([el]);

      actions.changeStrokeColor("#ff0000");

      expect(el.strokeColor).toBe("#ff0000");
      expect(styleDefaults.strokeColor.value).toBe("#ff0000");
      expect(markDirty).toHaveBeenCalledOnce();
    });
  });

  describe("changeBackgroundColor", () => {
    it("mutates selected elements and updates defaults", () => {
      const el = createTestElement({ id: "b" });
      const { actions, styleDefaults, markDirty } = setup([el]);

      actions.changeBackgroundColor("#00ff00");

      expect(el.backgroundColor).toBe("#00ff00");
      expect(styleDefaults.backgroundColor.value).toBe("#00ff00");
      expect(markDirty).toHaveBeenCalledOnce();
    });
  });

  describe("changeFillStyle", () => {
    it("mutates selected elements and updates defaults", () => {
      const el = createTestElement({ id: "c" });
      const { actions, styleDefaults } = setup([el]);

      actions.changeFillStyle("solid");

      expect(el.fillStyle).toBe("solid");
      expect(styleDefaults.fillStyle.value).toBe("solid");
    });
  });

  describe("changeStrokeWidth", () => {
    it("mutates selected elements and updates defaults", () => {
      const el = createTestElement({ id: "d" });
      const { actions, styleDefaults } = setup([el]);

      actions.changeStrokeWidth(4);

      expect(el.strokeWidth).toBe(4);
      expect(styleDefaults.strokeWidth.value).toBe(4);
    });
  });

  describe("changeStrokeStyle", () => {
    it("mutates selected elements and updates defaults", () => {
      const el = createTestElement({ id: "e" });
      const { actions, styleDefaults } = setup([el]);

      actions.changeStrokeStyle("dashed");

      expect(el.strokeStyle).toBe("dashed");
      expect(styleDefaults.strokeStyle.value).toBe("dashed");
    });
  });

  describe("changeOpacity", () => {
    it("mutates selected elements and updates defaults", () => {
      const el = createTestElement({ id: "f" });
      const { actions, styleDefaults } = setup([el]);

      actions.changeOpacity(50);

      expect(el.opacity).toBe(50);
      expect(styleDefaults.opacity.value).toBe(50);
    });
  });

  describe("changeRoundness", () => {
    it("sets roundness to proportional for round", () => {
      const el = createTestElement({ id: "g" });
      const { actions, styleDefaults } = setup([el]);

      actions.changeRoundness("round");

      expect(el.roundness).toEqual({ type: 3 });
      expect(styleDefaults.roundness.value).toBe("round");
    });

    it("sets roundness to null for sharp", () => {
      const el = createTestElement({ id: "h" });
      const { actions, styleDefaults } = setup([el]);

      actions.changeRoundness("sharp");

      expect(el.roundness).toBeNull();
      expect(styleDefaults.roundness.value).toBe("sharp");
    });
  });

  describe("changeFontFamily", () => {
    it("mutates selected elements and updates defaults", () => {
      const el = createTestElement({ id: "i" });
      const { actions, styleDefaults } = setup([el]);

      actions.changeFontFamily(2);

      expect((el as Record<string, unknown>).fontFamily).toBe(2);
      expect(styleDefaults.fontFamily.value).toBe(2);
    });
  });

  describe("changeFontSize", () => {
    it("mutates selected elements and updates defaults", () => {
      const el = createTestElement({ id: "j" });
      const { actions, styleDefaults } = setup([el]);

      actions.changeFontSize(32);

      expect((el as Record<string, unknown>).fontSize).toBe(32);
      expect(styleDefaults.fontSize.value).toBe(32);
    });
  });

  describe("changeTextAlign", () => {
    it("mutates selected elements and updates defaults", () => {
      const el = createTestElement({ id: "k" });
      const { actions, styleDefaults } = setup([el]);

      actions.changeTextAlign("center");

      expect((el as Record<string, unknown>).textAlign).toBe("center");
      expect(styleDefaults.textAlign.value).toBe("center");
    });
  });

  describe("changeArrowhead", () => {
    it("changes start arrowhead", () => {
      const el = createTestArrowElement({ id: "l" });
      const { actions, styleDefaults } = setup([el]);

      actions.changeArrowhead("start", "triangle");

      expect(el.startArrowhead).toBe("triangle");
      expect(styleDefaults.startArrowhead.value).toBe("triangle");
    });

    it("changes end arrowhead", () => {
      const el = createTestArrowElement({ id: "m" });
      const { actions, styleDefaults } = setup([el]);

      actions.changeArrowhead("end", null);

      expect(el.endArrowhead).toBeNull();
      expect(styleDefaults.endArrowhead.value).toBeNull();
    });
  });

  describe("applies to multiple elements", () => {
    it("mutates all selected elements", () => {
      const el1 = createTestElement({ id: "x1" });
      const el2 = createTestElement({ id: "x2" });
      const { actions } = setup([el1, el2]);

      actions.changeStrokeColor("#aabbcc");

      expect(el1.strokeColor).toBe("#aabbcc");
      expect(el2.strokeColor).toBe("#aabbcc");
    });
  });

  describe("getFormValue", () => {
    it("returns fallback when no elements are selected", () => {
      const { actions } = setup([]);

      expect(actions.getFormValue("strokeColor", "#000")).toBe("#000");
    });

    it("returns the value when all elements share the same value", () => {
      const el1 = createTestElement({ id: "u1", strokeColor: "#ff0000" });
      const el2 = createTestElement({ id: "u2", strokeColor: "#ff0000" });
      const { actions } = setup([el1, el2]);

      expect(actions.getFormValue("strokeColor", "#000")).toBe("#ff0000");
    });

    it("returns mixed when elements have different values", () => {
      const el1 = createTestElement({ id: "v1", strokeColor: "#ff0000" });
      const el2 = createTestElement({ id: "v2", strokeColor: "#00ff00" });
      const { actions } = setup([el1, el2]);

      expect(actions.getFormValue("strokeColor", "#000")).toBe("mixed");
    });

    it("returns single value for one element", () => {
      const el = createTestElement({ id: "w1", opacity: 75 });
      const { actions } = setup([el]);

      expect(actions.getFormValue("opacity", 100)).toBe(75);
    });
  });
});
