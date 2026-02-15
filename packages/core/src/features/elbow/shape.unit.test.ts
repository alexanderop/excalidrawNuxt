import { pointFrom } from "../../shared/math";
import type { LocalPoint } from "../../shared/math";
import { generateElbowArrowShape } from "./shape";

describe("generateElbowArrowShape", () => {
  it("returns empty string for fewer than 2 points", () => {
    expect(generateElbowArrowShape([])).toBe("");
    expect(generateElbowArrowShape([pointFrom<LocalPoint>(0, 0)])).toBe("");
  });

  it("generates a straight line for 2 points (no corners)", () => {
    const points = [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 0)];
    const path = generateElbowArrowShape(points);
    expect(path).toContain("M 0 0");
    expect(path).toContain("L 100 0");
    // No Q commands for a straight line
    expect(path).not.toContain("Q ");
  });

  it("generates an SVG path with Q curves for an L-shaped path", () => {
    const points = [
      pointFrom<LocalPoint>(0, 0),
      pointFrom<LocalPoint>(50, 0),
      pointFrom<LocalPoint>(50, 50),
    ];
    const path = generateElbowArrowShape(points);
    expect(path).toContain("M 0 0");
    // Should have at least one Q (quadratic Bezier) command
    expect(path).toContain("Q ");
    expect(path).toContain("L 50 50");
  });

  it("generates Q curves for a U-shaped path", () => {
    const points = [
      pointFrom<LocalPoint>(0, 0),
      pointFrom<LocalPoint>(50, 0),
      pointFrom<LocalPoint>(50, 50),
      pointFrom<LocalPoint>(100, 50),
    ];
    const path = generateElbowArrowShape(points);
    expect(path).toContain("M 0 0");
    expect(path).toContain("L 100 50");
    // Two corners means two Q commands
    const qCount = (path.match(/Q /g) ?? []).length;
    expect(qCount).toBe(2);
  });

  it("limits corner radius to half the segment distance", () => {
    // Short segments: corner radius should be reduced
    const points = [
      pointFrom<LocalPoint>(0, 0),
      pointFrom<LocalPoint>(10, 0), // only 10px segment
      pointFrom<LocalPoint>(10, 10),
    ];
    const path = generateElbowArrowShape(points, 16);
    // The Q control point should still be at (10, 0)
    // but the L points should be within 5px (half of 10) of the corner
    expect(path).toContain("Q 10 0");
  });

  it("respects custom radius parameter", () => {
    const points = [
      pointFrom<LocalPoint>(0, 0),
      pointFrom<LocalPoint>(100, 0),
      pointFrom<LocalPoint>(100, 100),
    ];
    const pathSmall = generateElbowArrowShape(points, 8);
    const pathLarge = generateElbowArrowShape(points, 32);
    // Different radii should produce different L coordinates before the Q
    expect(pathSmall).not.toBe(pathLarge);
  });

  it("handles complex elbow with many corners", () => {
    const points = [
      pointFrom<LocalPoint>(0, 0),
      pointFrom<LocalPoint>(50, 0),
      pointFrom<LocalPoint>(50, 50),
      pointFrom<LocalPoint>(100, 50),
      pointFrom<LocalPoint>(100, 100),
      pointFrom<LocalPoint>(150, 100),
    ];
    const path = generateElbowArrowShape(points);
    // 4 interior points = 4 Q curves
    const qCount = (path.match(/Q /g) ?? []).length;
    expect(qCount).toBe(4);
    // Starts with M and ends with L to last point
    expect(path).toMatch(/^M 0 0/);
    expect(path).toMatch(/L 150 100$/);
  });
});
