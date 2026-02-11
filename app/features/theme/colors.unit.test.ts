import { applyDarkModeFilter, resolveColor } from "./colors";

describe("applyDarkModeFilter", () => {
  it("transforms white to near-black", () => {
    const result = applyDarkModeFilter("#ffffff");
    // Expected ~#121212 based on Excalidraw spec
    expect(result).toMatch(/^#1[0-3][\da-f]{4}$/i);
  });

  it("transforms near-black to near-white", () => {
    const result = applyDarkModeFilter("#1e1e1e");
    // Expected ~#e3e3e3 based on Excalidraw spec
    expect(result).toMatch(/^#[d-f][\da-f]{5}$/i);
  });

  it("transforms light gray to dark gray", () => {
    const result = applyDarkModeFilter("#dddddd");
    // Expected dark gray
    expect(result).toMatch(/^#[0-3][\da-f]{5}$/i);
  });

  it("preserves alpha channel", () => {
    const result = applyDarkModeFilter("rgba(255, 255, 255, 0.5)");
    // Should end with alpha hex (80 = 0.5 * 255 rounded)
    expect(result).toHaveLength(9); // #rrggbbaa
  });

  it("returns consistent results (caching)", () => {
    const first = applyDarkModeFilter("#ff0000");
    const second = applyDarkModeFilter("#ff0000");
    expect(first).toBe(second);
  });

  it("handles transparent color", () => {
    const result = applyDarkModeFilter("transparent");
    // tinycolor parses transparent as rgba(0,0,0,0)
    expect(result).toBeDefined();
  });
});

describe("resolveColor", () => {
  it("returns the same color in light theme", () => {
    expect(resolveColor("#ff0000", "light")).toBe("#ff0000");
  });

  it("applies dark mode filter in dark theme", () => {
    const result = resolveColor("#ff0000", "dark");
    expect(result).toMatch(/^#[\da-f]+$/i);
  });

  it("dark result differs from original", () => {
    const original = "#336699";
    const result = resolveColor(original, "dark");
    expect(result).not.toBe(original);
  });

  it("light mode preserves any color string", () => {
    const colors = ["#abcdef", "transparent", "rgb(100,200,50)", "#1e1e1e"];
    for (const color of colors) {
      expect(resolveColor(color, "light")).toBe(color);
    }
  });

  it("dark mode for white returns a dark value", () => {
    const result = resolveColor("#ffffff", "dark");
    // White inverted should produce a near-black value
    expect(result).toMatch(/^#1[0-3][\da-f]{4}$/i);
  });

  it("dark mode for black returns a light value", () => {
    const result = resolveColor("#1e1e1e", "dark");
    // Near-black inverted should produce a near-white value
    expect(result).toMatch(/^#[d-f][\da-f]{5}$/i);
  });
});
