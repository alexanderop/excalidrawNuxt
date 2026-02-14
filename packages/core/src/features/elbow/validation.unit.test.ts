import { pointFrom } from "../../shared/math";
import type { GlobalPoint, LocalPoint } from "../../shared/math";
import { validateElbowPoints, removeShortSegments, getCornerPoints } from "./validation";

describe("validation", () => {
  describe("validateElbowPoints", () => {
    it("returns true for a purely horizontal segment", () => {
      const points = [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 0)];
      expect(validateElbowPoints(points)).toBe(true);
    });

    it("returns true for a purely vertical segment", () => {
      const points = [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(0, 100)];
      expect(validateElbowPoints(points)).toBe(true);
    });

    it("returns true for a valid elbow path (H-V-H)", () => {
      const points = [
        pointFrom<LocalPoint>(0, 0),
        pointFrom<LocalPoint>(50, 0),
        pointFrom<LocalPoint>(50, 50),
        pointFrom<LocalPoint>(100, 50),
      ];
      expect(validateElbowPoints(points)).toBe(true);
    });

    it("returns false for a diagonal segment", () => {
      const points = [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(50, 50)];
      expect(validateElbowPoints(points)).toBe(false);
    });

    it("returns true for a single point", () => {
      const points = [pointFrom<LocalPoint>(10, 10)];
      expect(validateElbowPoints(points)).toBe(true);
    });

    it("returns true for an empty array", () => {
      expect(validateElbowPoints([])).toBe(true);
    });

    it("respects custom tolerance", () => {
      const points = [
        pointFrom<LocalPoint>(0, 0),
        pointFrom<LocalPoint>(0.5, 100), // slight x deviation
      ];
      expect(validateElbowPoints(points, 1)).toBe(true);
      expect(validateElbowPoints(points, 0.1)).toBe(false);
    });

    it("works with GlobalPoint", () => {
      const points = [
        pointFrom<GlobalPoint>(10, 20),
        pointFrom<GlobalPoint>(10, 50),
        pointFrom<GlobalPoint>(80, 50),
      ];
      expect(validateElbowPoints(points)).toBe(true);
    });
  });

  describe("removeShortSegments", () => {
    it("preserves first and last points always", () => {
      const points = [
        pointFrom<LocalPoint>(0, 0),
        pointFrom<LocalPoint>(0.5, 0),
        pointFrom<LocalPoint>(0.5, 0.5),
        pointFrom<LocalPoint>(100, 0.5),
      ];
      const result = removeShortSegments(points);
      expect(result[0]).toEqual(pointFrom<LocalPoint>(0, 0));
      expect(result.at(-1)).toEqual(pointFrom<LocalPoint>(100, 0.5));
    });

    it("removes interior points with segments shorter than threshold", () => {
      const points = [
        pointFrom<LocalPoint>(0, 0),
        pointFrom<LocalPoint>(0, 0.3), // very close to previous
        pointFrom<LocalPoint>(50, 0.3),
        pointFrom<LocalPoint>(100, 0.3),
      ];
      const result = removeShortSegments(points);
      // The second point (0.3 away from first) should be removed
      expect(result).toHaveLength(3);
    });

    it("keeps points with segments longer than threshold", () => {
      const points = [
        pointFrom<LocalPoint>(0, 0),
        pointFrom<LocalPoint>(50, 0),
        pointFrom<LocalPoint>(50, 50),
        pointFrom<LocalPoint>(100, 50),
      ];
      const result = removeShortSegments(points);
      expect(result).toHaveLength(4);
    });

    it("does not modify arrays with fewer than 4 points", () => {
      const points = [
        pointFrom<LocalPoint>(0, 0),
        pointFrom<LocalPoint>(0.1, 0),
        pointFrom<LocalPoint>(100, 0),
      ];
      const result = removeShortSegments(points);
      expect(result).toHaveLength(3);
    });

    it("respects custom threshold", () => {
      const points = [
        pointFrom<LocalPoint>(0, 0),
        pointFrom<LocalPoint>(3, 0),
        pointFrom<LocalPoint>(3, 50),
        pointFrom<LocalPoint>(100, 50),
      ];
      // Default threshold=1: 3px distance is kept
      expect(removeShortSegments(points)).toHaveLength(4);
      // Custom threshold=5: 3px distance is removed
      expect(removeShortSegments(points, 5)).toHaveLength(3);
    });
  });

  describe("getCornerPoints", () => {
    it("keeps first and last points", () => {
      const points = [
        pointFrom<LocalPoint>(0, 0),
        pointFrom<LocalPoint>(50, 0),
        pointFrom<LocalPoint>(50, 50),
        pointFrom<LocalPoint>(100, 50),
      ];
      const corners = getCornerPoints(points);
      expect(corners[0]).toEqual(pointFrom<LocalPoint>(0, 0));
      expect(corners.at(-1)).toEqual(pointFrom<LocalPoint>(100, 50));
    });

    it("keeps points where direction changes", () => {
      const points = [
        pointFrom<LocalPoint>(0, 0),
        pointFrom<LocalPoint>(50, 0), // H segment
        pointFrom<LocalPoint>(50, 50), // V segment (direction change)
        pointFrom<LocalPoint>(100, 50), // H segment (direction change)
      ];
      const corners = getCornerPoints(points);
      expect(corners).toEqual(points);
    });

    it("removes collinear points on same-direction segments", () => {
      const points = [
        pointFrom<LocalPoint>(0, 0),
        pointFrom<LocalPoint>(25, 0), // H segment
        pointFrom<LocalPoint>(50, 0), // H segment (same direction, remove 25,0)
        pointFrom<LocalPoint>(50, 50), // V segment
        pointFrom<LocalPoint>(100, 50), // H segment
      ];
      const corners = getCornerPoints(points);
      // The middle H point (25, 0) should be removed
      expect(corners).toHaveLength(4);
      expect(corners[1]).toEqual(pointFrom<LocalPoint>(50, 0));
    });

    it("returns single point array as-is", () => {
      const points = [pointFrom<LocalPoint>(10, 20)];
      expect(getCornerPoints(points)).toEqual([pointFrom<LocalPoint>(10, 20)]);
    });

    it("returns empty array for empty input", () => {
      expect(getCornerPoints([])).toEqual([]);
    });

    it("handles L-shaped path (single corner)", () => {
      const points = [
        pointFrom<LocalPoint>(0, 0),
        pointFrom<LocalPoint>(50, 0),
        pointFrom<LocalPoint>(50, 50),
      ];
      const corners = getCornerPoints(points);
      expect(corners).toHaveLength(3);
    });
  });
});
