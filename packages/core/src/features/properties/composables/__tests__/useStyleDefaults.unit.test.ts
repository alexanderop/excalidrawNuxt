import { describe, it, expect } from "vitest";
import { withDrawVue } from "../../../../__test-utils__/withDrawVue";
import {
  DEFAULT_STROKE_COLOR,
  DEFAULT_BG_COLOR,
  DEFAULT_FILL_STYLE,
  DEFAULT_STROKE_WIDTH,
  DEFAULT_ROUGHNESS,
  DEFAULT_OPACITY,
  DEFAULT_FONT_SIZE,
  DEFAULT_FONT_FAMILY,
  DEFAULT_TEXT_ALIGN,
} from "../../../elements/constants";

describe("useStyleDefaults", () => {
  it("has initial values matching element constants", () => {
    using ctx = withDrawVue(() => ({}));
    const defaults = ctx.drawVue.styleDefaults;
    expect(defaults.strokeColor.value).toBe(DEFAULT_STROKE_COLOR);
    expect(defaults.backgroundColor.value).toBe(DEFAULT_BG_COLOR);
    expect(defaults.fillStyle.value).toBe(DEFAULT_FILL_STYLE);
    expect(defaults.strokeWidth.value).toBe(DEFAULT_STROKE_WIDTH);
    expect(defaults.roughness.value).toBe(DEFAULT_ROUGHNESS);
    expect(defaults.opacity.value).toBe(DEFAULT_OPACITY);
    expect(defaults.fontSize.value).toBe(DEFAULT_FONT_SIZE);
    expect(defaults.fontFamily.value).toBe(DEFAULT_FONT_FAMILY);
    expect(defaults.textAlign.value).toBe(DEFAULT_TEXT_ALIGN);
  });

  it("has correct non-constant defaults", () => {
    using ctx = withDrawVue(() => ({}));
    const defaults = ctx.drawVue.styleDefaults;
    expect(defaults.strokeStyle.value).toBe("solid");
    expect(defaults.roundness.value).toBe("round");
    expect(defaults.startArrowhead.value).toBeNull();
    expect(defaults.endArrowhead.value).toBe("arrow");
    expect(defaults.recentColors.value).toEqual([]);
  });

  it("values are reactive", () => {
    using ctx = withDrawVue(() => ({}));
    const defaults = ctx.drawVue.styleDefaults;
    defaults.strokeColor.value = "#ff0000";
    expect(defaults.strokeColor.value).toBe("#ff0000");

    defaults.opacity.value = 50;
    expect(defaults.opacity.value).toBe(50);
  });

  it("each withDrawVue call gets isolated state", () => {
    using a = withDrawVue(() => ({}));
    using b = withDrawVue(() => ({}));
    a.drawVue.styleDefaults.strokeColor.value = "#aabbcc";
    // Different instances should NOT share state
    expect(b.drawVue.styleDefaults.strokeColor.value).not.toBe("#aabbcc");
  });
});
