import { describe, it, expect } from "vitest";
import {
  curveCatmullRomToBezier,
  bezierPoint,
  bezierClosestPoint,
  bezierLength,
  distanceToBezierCurves,
  CATMULL_ROM_TENSION,
} from "./curve";
import { pointFrom, pointDistance } from "./math";
import type { LocalPoint } from "./math";

describe("curve", () => {
  describe("curveCatmullRomToBezier", () => {
    it("returns empty array for fewer than 2 points", () => {
      expect(curveCatmullRomToBezier([])).toEqual([]);
      expect(curveCatmullRomToBezier([pointFrom<LocalPoint>(0, 0)])).toEqual([]);
    });

    it("returns 1 curve for 2 points", () => {
      const curves = curveCatmullRomToBezier([
        pointFrom<LocalPoint>(0, 0),
        pointFrom<LocalPoint>(100, 0),
      ]);
      expect(curves).toHaveLength(1);
    });

    it("returns 2 curves for 3 points", () => {
      const curves = curveCatmullRomToBezier([
        pointFrom<LocalPoint>(0, 0),
        pointFrom<LocalPoint>(50, 50),
        pointFrom<LocalPoint>(100, 0),
      ]);
      expect(curves).toHaveLength(2);
    });

    it("curve endpoints match input points", () => {
      const p1 = pointFrom<LocalPoint>(0, 0);
      const p2 = pointFrom<LocalPoint>(100, 0);
      const curves = curveCatmullRomToBezier([p1, p2]);
      expect(curves[0]![0]).toEqual(p1); // start
      expect(curves[0]![3]).toEqual(p2); // end
    });

    it("uses default tension of 0.5", () => {
      expect(CATMULL_ROM_TENSION).toBe(0.5);
    });

    it("produces n-1 curves for n points", () => {
      const points = [
        pointFrom<LocalPoint>(0, 0),
        pointFrom<LocalPoint>(25, 50),
        pointFrom<LocalPoint>(50, 0),
        pointFrom<LocalPoint>(75, 50),
        pointFrom<LocalPoint>(100, 0),
      ];
      const curves = curveCatmullRomToBezier(points);
      expect(curves).toHaveLength(4);
    });

    it("consecutive curves share endpoints", () => {
      const points = [
        pointFrom<LocalPoint>(0, 0),
        pointFrom<LocalPoint>(50, 50),
        pointFrom<LocalPoint>(100, 0),
      ];
      const curves = curveCatmullRomToBezier(points);
      // End of first curve = start of second curve
      expect(curves[0]![3]).toEqual(curves[1]![0]);
    });
  });

  describe("bezierPoint", () => {
    it("returns start point at t=0", () => {
      const c = [
        pointFrom<LocalPoint>(0, 0),
        pointFrom<LocalPoint>(33, 0),
        pointFrom<LocalPoint>(66, 0),
        pointFrom<LocalPoint>(100, 0),
      ] as const;
      const p = bezierPoint(c, 0);
      expect(p[0]).toBeCloseTo(0);
      expect(p[1]).toBeCloseTo(0);
    });

    it("returns end point at t=1", () => {
      const c = [
        pointFrom<LocalPoint>(0, 0),
        pointFrom<LocalPoint>(33, 0),
        pointFrom<LocalPoint>(66, 0),
        pointFrom<LocalPoint>(100, 0),
      ] as const;
      const p = bezierPoint(c, 1);
      expect(p[0]).toBeCloseTo(100);
      expect(p[1]).toBeCloseTo(0);
    });

    it("returns midpoint-ish at t=0.5 for a symmetric curve", () => {
      const c = [
        pointFrom<LocalPoint>(0, 0),
        pointFrom<LocalPoint>(0, 100),
        pointFrom<LocalPoint>(100, 100),
        pointFrom<LocalPoint>(100, 0),
      ] as const;
      const p = bezierPoint(c, 0.5);
      expect(p[0]).toBeCloseTo(50);
      expect(p[1]).toBeCloseTo(75);
    });
  });

  describe("bezierLength", () => {
    it("approximates length of a straight-line bezier", () => {
      const c = [
        pointFrom<LocalPoint>(0, 0),
        pointFrom<LocalPoint>(33, 0),
        pointFrom<LocalPoint>(66, 0),
        pointFrom<LocalPoint>(100, 0),
      ] as const;
      const length = bezierLength(c);
      expect(length).toBeCloseTo(100, 0);
    });

    it("curved bezier is longer than straight-line distance", () => {
      const c = [
        pointFrom<LocalPoint>(0, 0),
        pointFrom<LocalPoint>(0, 100),
        pointFrom<LocalPoint>(100, 100),
        pointFrom<LocalPoint>(100, 0),
      ] as const;
      const length = bezierLength(c);
      const straight = pointDistance(c[0], c[3]);
      expect(length).toBeGreaterThan(straight);
    });
  });

  describe("bezierClosestPoint", () => {
    it("finds a point on the curve near the test point", () => {
      const c = [
        pointFrom<LocalPoint>(0, 0),
        pointFrom<LocalPoint>(33, 50),
        pointFrom<LocalPoint>(66, 50),
        pointFrom<LocalPoint>(100, 0),
      ] as const;
      const result = bezierClosestPoint(c, pointFrom<LocalPoint>(50, 0));
      expect(result.distance).toBeLessThan(40);
      expect(result.t).toBeGreaterThan(0);
      expect(result.t).toBeLessThan(1);
    });

    it("returns start point when queried near start", () => {
      const c = [
        pointFrom<LocalPoint>(0, 0),
        pointFrom<LocalPoint>(33, 0),
        pointFrom<LocalPoint>(66, 0),
        pointFrom<LocalPoint>(100, 0),
      ] as const;
      const result = bezierClosestPoint(c, pointFrom<LocalPoint>(-5, 0));
      expect(result.t).toBeLessThan(0.1);
      expect(result.distance).toBeLessThan(6);
    });

    it("returns end point when queried near end", () => {
      const c = [
        pointFrom<LocalPoint>(0, 0),
        pointFrom<LocalPoint>(33, 0),
        pointFrom<LocalPoint>(66, 0),
        pointFrom<LocalPoint>(100, 0),
      ] as const;
      const result = bezierClosestPoint(c, pointFrom<LocalPoint>(105, 0));
      expect(result.t).toBeGreaterThan(0.9);
      expect(result.distance).toBeLessThan(6);
    });
  });

  describe("distanceToBezierCurves", () => {
    it("returns Infinity for empty array", () => {
      expect(distanceToBezierCurves([], pointFrom<LocalPoint>(0, 0))).toBe(Infinity);
    });

    it("returns 0 for a point on the curve start", () => {
      const c = [
        pointFrom<LocalPoint>(0, 0),
        pointFrom<LocalPoint>(33, 0),
        pointFrom<LocalPoint>(66, 0),
        pointFrom<LocalPoint>(100, 0),
      ] as const;
      const dist = distanceToBezierCurves([c], pointFrom<LocalPoint>(0, 0));
      expect(dist).toBeCloseTo(0, 1);
    });

    it("finds closest across multiple curves", () => {
      const c1 = [
        pointFrom<LocalPoint>(0, 0),
        pointFrom<LocalPoint>(33, 0),
        pointFrom<LocalPoint>(66, 0),
        pointFrom<LocalPoint>(100, 0),
      ] as const;
      const c2 = [
        pointFrom<LocalPoint>(0, 200),
        pointFrom<LocalPoint>(33, 200),
        pointFrom<LocalPoint>(66, 200),
        pointFrom<LocalPoint>(100, 200),
      ] as const;
      const dist = distanceToBezierCurves([c1, c2], pointFrom<LocalPoint>(50, 195));
      expect(dist).toBeLessThan(10);
    });
  });
});
