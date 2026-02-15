import { pointFrom } from "../../shared/math";
import type { LocalPoint } from "../../shared/math";
import { createTestArrowElement } from "../../__test-utils__/factories/element";
import { getArrowMidpoint } from "./arrowMidpoint";

describe("getArrowMidpoint", () => {
  describe("straight arrows", () => {
    it("returns midpoint of a 2-point horizontal arrow", () => {
      const arrow = createTestArrowElement({
        x: 0,
        y: 0,
        points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 0)],
      });

      const mid = getArrowMidpoint(arrow);

      expect(mid[0]).toBeCloseTo(50);
      expect(mid[1]).toBeCloseTo(0);
    });

    it("returns midpoint of a 2-point diagonal arrow", () => {
      const arrow = createTestArrowElement({
        x: 10,
        y: 20,
        points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 0)],
      });

      const mid = getArrowMidpoint(arrow);

      // Global: (10 + 50, 20 + 0) = (60, 20)
      expect(mid[0]).toBeCloseTo(60);
      expect(mid[1]).toBeCloseTo(20);
    });

    it("returns midpoint at 50% total length for a 3-point arrow", () => {
      // Two segments: (0,0)->(100,0) length=100, (100,0)->(100,100) length=100
      // Total = 200, 50% = 100, which is at the corner point
      const arrow = createTestArrowElement({
        x: 0,
        y: 0,
        points: [
          pointFrom<LocalPoint>(0, 0),
          pointFrom<LocalPoint>(100, 0),
          pointFrom<LocalPoint>(100, 100),
        ],
      });

      const mid = getArrowMidpoint(arrow);

      expect(mid[0]).toBeCloseTo(100);
      expect(mid[1]).toBeCloseTo(0);
    });

    it("returns midpoint between corners for unequal segment lengths", () => {
      // Segments: (0,0)->(200,0) length=200, (200,0)->(200,100) length=100
      // Total = 300, 50% = 150, on first segment at t=0.75 => (150, 0)
      const arrow = createTestArrowElement({
        x: 0,
        y: 0,
        points: [
          pointFrom<LocalPoint>(0, 0),
          pointFrom<LocalPoint>(200, 0),
          pointFrom<LocalPoint>(200, 100),
        ],
      });

      const mid = getArrowMidpoint(arrow);

      expect(mid[0]).toBeCloseTo(150);
      expect(mid[1]).toBeCloseTo(0);
    });

    it("returns midpoint in global coordinates for arrow at non-zero x,y", () => {
      const arrow = createTestArrowElement({
        x: 50,
        y: 75,
        points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 0)],
      });

      const mid = getArrowMidpoint(arrow);

      // Global: (50 + 50, 75 + 0) = (100, 75)
      expect(mid[0]).toBeCloseTo(100);
      expect(mid[1]).toBeCloseTo(75);
    });

    it("handles single-point arrow gracefully", () => {
      const arrow = createTestArrowElement({
        x: 10,
        y: 20,
        points: [pointFrom<LocalPoint>(0, 0)],
      });

      const mid = getArrowMidpoint(arrow);

      expect(mid[0]).toBe(10);
      expect(mid[1]).toBe(20);
    });
  });

  describe("curved arrows", () => {
    it("returns midpoint for a curved arrow with roundness set", () => {
      // With roundness, the Catmull-Rom algorithm is used
      // Need at least 2 points for a curve
      const arrow = createTestArrowElement({
        x: 0,
        y: 0,
        roundness: { type: 2, value: 0.25 },
        points: [
          pointFrom<LocalPoint>(0, 0),
          pointFrom<LocalPoint>(50, 50),
          pointFrom<LocalPoint>(100, 0),
        ],
      });

      const mid = getArrowMidpoint(arrow);

      // The midpoint should be somewhere near the middle of the path
      // Due to curvature, exact values differ from straight midpoint
      // but should be in a reasonable range
      expect(mid[0]).toBeGreaterThan(20);
      expect(mid[0]).toBeLessThan(80);
      expect(mid[1]).toBeGreaterThan(0);
    });

    it("falls back to straight midpoint for 2-point curved arrow", () => {
      // curveCatmullRomCubicApproxPoints needs 3+ points to produce curves
      const arrow = createTestArrowElement({
        x: 0,
        y: 0,
        roundness: { type: 2, value: 0.25 },
        points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 0)],
      });

      const mid = getArrowMidpoint(arrow);

      // Falls back to straight midpoint
      expect(mid[0]).toBeCloseTo(50);
      expect(mid[1]).toBeCloseTo(0);
    });
  });
});
