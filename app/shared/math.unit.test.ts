import {
  TWO_PI,
  pointFrom,
  pointDistance,
  pointCenter,
  pointRotateRads,
  clamp,
  snapAngle,
  normalizePoints,
  getSizeFromPoints,
} from "~/shared/math";
import type { GlobalPoint, LocalPoint, Radians } from "~/shared/math";

describe("math utilities", () => {
  describe("TWO_PI", () => {
    it("equals Math.PI * 2", () => {
      expect(TWO_PI).toBe(Math.PI * 2);
    });
  });

  describe("pointFrom", () => {
    it("creates a point with given coordinates as a tuple", () => {
      const p = pointFrom<GlobalPoint>(3, 7);
      expect(p).toEqual([3, 7]);
    });

    it("handles negative coordinates", () => {
      const p = pointFrom<GlobalPoint>(-5, -10);
      expect(p).toEqual([-5, -10]);
    });

    it("handles zero coordinates", () => {
      const p = pointFrom<GlobalPoint>(0, 0);
      expect(p).toEqual([0, 0]);
    });

    it("creates LocalPoint branded tuples", () => {
      const p = pointFrom<LocalPoint>(10, 20);
      expect(p).toEqual([10, 20]);
      expect(p[0]).toBe(10);
      expect(p[1]).toBe(20);
    });
  });

  describe("pointDistance", () => {
    it("returns 0 for identical points", () => {
      const p = pointFrom<GlobalPoint>(5, 5);
      expect(pointDistance(p, p)).toBe(0);
    });

    it("returns euclidean distance for a 3-4-5 triangle", () => {
      const a = pointFrom<GlobalPoint>(0, 0);
      const b = pointFrom<GlobalPoint>(3, 4);
      expect(pointDistance(a, b)).toBe(5);
    });

    it("returns distance along x-axis", () => {
      const a = pointFrom<GlobalPoint>(0, 0);
      const b = pointFrom<GlobalPoint>(7, 0);
      expect(pointDistance(a, b)).toBe(7);
    });

    it("returns distance along y-axis", () => {
      const a = pointFrom<GlobalPoint>(0, 0);
      const b = pointFrom<GlobalPoint>(0, 9);
      expect(pointDistance(a, b)).toBe(9);
    });

    it("is commutative", () => {
      const a = pointFrom<GlobalPoint>(1, 2);
      const b = pointFrom<GlobalPoint>(4, 6);
      expect(pointDistance(a, b)).toBe(pointDistance(b, a));
    });

    it("handles negative coordinates", () => {
      const a = pointFrom<GlobalPoint>(-1, -1);
      const b = pointFrom<GlobalPoint>(2, 3);
      expect(pointDistance(a, b)).toBe(5);
    });
  });

  describe("pointCenter", () => {
    it("returns the midpoint between two points", () => {
      const a = pointFrom<GlobalPoint>(0, 0);
      const b = pointFrom<GlobalPoint>(10, 10);
      expect(pointCenter(a, b)).toEqual([5, 5]);
    });

    it("returns the same point when both inputs are identical", () => {
      const p = pointFrom<GlobalPoint>(3, 7);
      expect(pointCenter(p, p)).toEqual([3, 7]);
    });

    it("handles negative coordinates", () => {
      const a = pointFrom<GlobalPoint>(-4, -6);
      const b = pointFrom<GlobalPoint>(4, 6);
      expect(pointCenter(a, b)).toEqual([0, 0]);
    });

    it("is commutative", () => {
      const a = pointFrom<GlobalPoint>(1, 2);
      const b = pointFrom<GlobalPoint>(5, 8);
      expect(pointCenter(a, b)).toEqual(pointCenter(b, a));
    });
  });

  describe("clamp", () => {
    it("returns value when within range", () => {
      expect(clamp(5, 0, 10)).toBe(5);
    });

    it("clamps to min when value is below", () => {
      expect(clamp(-5, 0, 10)).toBe(0);
    });

    it("clamps to max when value is above", () => {
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it("returns min when value equals min", () => {
      expect(clamp(0, 0, 10)).toBe(0);
    });

    it("returns max when value equals max", () => {
      expect(clamp(10, 0, 10)).toBe(10);
    });

    it("handles negative ranges", () => {
      expect(clamp(-3, -5, -1)).toBe(-3);
      expect(clamp(-10, -5, -1)).toBe(-5);
      expect(clamp(0, -5, -1)).toBe(-1);
    });
  });

  describe("snapAngle", () => {
    it("snaps to nearest 15-degree increment", () => {
      // ~20 degrees should snap to 15 or 30
      const result = snapAngle(100, 36);
      const angle = Math.atan2(result.dy, result.dx);
      const degrees = Math.round((angle * 180) / Math.PI);
      expect(degrees % 15).toBe(0);
    });

    it("returns dx and dy properties", () => {
      const result = snapAngle(100, 0);
      expect(result).toHaveProperty("dx");
      expect(result).toHaveProperty("dy");
    });

    it("preserves length after snapping", () => {
      const dx = 80;
      const dy = 60;
      const result = snapAngle(dx, dy);
      const originalLength = Math.hypot(dx, dy);
      const snappedLength = Math.hypot(result.dx, result.dy);
      expect(snappedLength).toBeCloseTo(originalLength);
    });

    it("snaps horizontal direction to 0 degrees", () => {
      const result = snapAngle(100, 3);
      const angle = Math.atan2(result.dy, result.dx);
      expect(angle).toBeCloseTo(0);
    });

    it("snaps vertical direction to 90 degrees", () => {
      const result = snapAngle(3, 100);
      const angle = Math.atan2(result.dy, result.dx);
      expect(angle).toBeCloseTo(Math.PI / 2);
    });
  });

  describe("pointRotateRads", () => {
    it("returns the same point when angle is 0", () => {
      const point = pointFrom<GlobalPoint>(5, 0);
      const center = pointFrom<GlobalPoint>(0, 0);
      const result = pointRotateRads(point, center, 0 as Radians);
      expect(result[0]).toBeCloseTo(5);
      expect(result[1]).toBeCloseTo(0);
    });

    it("rotates 90 degrees", () => {
      const point = pointFrom<GlobalPoint>(1, 0);
      const center = pointFrom<GlobalPoint>(0, 0);
      const result = pointRotateRads(point, center, (Math.PI / 2) as Radians);
      expect(result[0]).toBeCloseTo(0);
      expect(result[1]).toBeCloseTo(1);
    });

    it("rotates 180 degrees", () => {
      const point = pointFrom<GlobalPoint>(1, 0);
      const center = pointFrom<GlobalPoint>(0, 0);
      const result = pointRotateRads(point, center, Math.PI as Radians);
      expect(result[0]).toBeCloseTo(-1);
      expect(result[1]).toBeCloseTo(0);
    });

    it("rotates around a non-origin center", () => {
      const point = pointFrom<GlobalPoint>(3, 2);
      const center = pointFrom<GlobalPoint>(2, 2);
      const result = pointRotateRads(point, center, (Math.PI / 2) as Radians);
      expect(result[0]).toBeCloseTo(2);
      expect(result[1]).toBeCloseTo(3);
    });

    it("full rotation returns to original point", () => {
      const point = pointFrom<GlobalPoint>(3, 7);
      const center = pointFrom<GlobalPoint>(1, 1);
      const result = pointRotateRads(point, center, TWO_PI as Radians);
      expect(result[0]).toBeCloseTo(point[0]);
      expect(result[1]).toBeCloseTo(point[1]);
    });

    it("preserves distance from center after rotation", () => {
      const point = pointFrom<GlobalPoint>(4, 3);
      const center = pointFrom<GlobalPoint>(1, 1);
      const result = pointRotateRads(point, center, 1.23 as Radians);
      expect(pointDistance(result, center)).toBeCloseTo(pointDistance(point, center));
    });
  });

  describe("normalizePoints", () => {
    it("returns unchanged when point[0] is already at origin", () => {
      const points = [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(50, 30)];
      const result = normalizePoints(10, 20, points);

      expect(result).toEqual({
        x: 10,
        y: 20,
        points: [
          [0, 0],
          [50, 30],
        ],
      });
    });

    it("shifts element position and offsets all points", () => {
      const points = [pointFrom<LocalPoint>(10, 5), pointFrom<LocalPoint>(60, 35)];
      const result = normalizePoints(100, 200, points);

      expect(result).toEqual({
        x: 110,
        y: 205,
        points: [
          [0, 0],
          [50, 30],
        ],
      });
    });

    it("handles empty points", () => {
      const result = normalizePoints(10, 20, []);

      expect(result).toEqual({ x: 10, y: 20, points: [] });
    });
  });

  describe("getSizeFromPoints", () => {
    it("computes width and height from points bounding box", () => {
      const points = [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 50)];
      const result = getSizeFromPoints(points);

      expect(result).toEqual({ width: 100, height: 50 });
    });

    it("handles negative coordinates", () => {
      const points = [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(-50, 30)];
      const result = getSizeFromPoints(points);

      expect(result).toEqual({ width: 50, height: 30 });
    });

    it("handles empty points", () => {
      const result = getSizeFromPoints([]);

      // Upstream getSizeFromPoints returns -Infinity for empty arrays
      // (this edge case never occurs in practice — arrows always have points)
      expect(result).toEqual({ width: -Infinity, height: -Infinity });
    });

    it("handles multi-point arrows", () => {
      const points = [
        pointFrom<LocalPoint>(0, 0),
        pointFrom<LocalPoint>(50, -20),
        pointFrom<LocalPoint>(100, 30),
      ];
      const result = getSizeFromPoints(points);

      expect(result).toEqual({ width: 100, height: 50 });
    });
  });
});
