import { describe, it, expect } from "vitest";
import { createTestArrowElement } from "~/__test-utils__/factories/element";
import { pointFrom } from "~/shared/math";
import type { LocalPoint, GlobalPoint } from "~/shared/math";
import {
  getPointPositions,
  getMidpointPositions,
  hitTestPointHandles,
  hitTestMidpoints,
  insertPointAtSegment,
  removePoints,
  normalizePoints,
  movePoint,
  movePoints,
  getSizeFromPoints,
} from "./pointHandles";

describe("getPointPositions", () => {
  it("converts relative points to scene coordinates", () => {
    const el = createTestArrowElement({
      x: 10,
      y: 20,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(50, 30)],
    });

    const positions = getPointPositions(el);

    expect(positions).toEqual([
      [10, 20],
      [60, 50],
    ]);
  });

  it("handles multi-point arrows", () => {
    const el = createTestArrowElement({
      x: 5,
      y: 5,
      points: [
        pointFrom<LocalPoint>(0, 0),
        pointFrom<LocalPoint>(10, 0),
        pointFrom<LocalPoint>(10, 10),
      ],
    });

    const positions = getPointPositions(el);

    expect(positions).toEqual([
      [5, 5],
      [15, 5],
      [15, 15],
    ]);
  });
});

describe("getMidpointPositions", () => {
  it("returns midpoints between consecutive points", () => {
    const el = createTestArrowElement({
      x: 0,
      y: 0,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 0)],
    });

    const midpoints = getMidpointPositions(el);

    expect(midpoints).toEqual([[50, 0]]);
  });

  it("returns N-1 midpoints for N points", () => {
    const el = createTestArrowElement({
      x: 0,
      y: 0,
      points: [
        pointFrom<LocalPoint>(0, 0),
        pointFrom<LocalPoint>(40, 0),
        pointFrom<LocalPoint>(40, 40),
      ],
    });

    const midpoints = getMidpointPositions(el);

    expect(midpoints).toHaveLength(2);
    expect(midpoints[0]).toEqual([20, 0]);
    expect(midpoints[1]).toEqual([40, 20]);
  });
});

describe("hitTestPointHandles", () => {
  it("returns index of hit point", () => {
    const el = createTestArrowElement({
      x: 100,
      y: 100,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(50, 0)],
    });

    expect(hitTestPointHandles(pointFrom<GlobalPoint>(100, 100), el, 1)).toBe(0);
    expect(hitTestPointHandles(pointFrom<GlobalPoint>(150, 100), el, 1)).toBe(1);
  });

  it("returns -1 for miss", () => {
    const el = createTestArrowElement({
      x: 100,
      y: 100,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(50, 0)],
    });

    expect(hitTestPointHandles(pointFrom<GlobalPoint>(125, 100), el, 1)).toBe(-1);
  });

  it("respects zoom for threshold", () => {
    const el = createTestArrowElement({
      x: 100,
      y: 100,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(50, 0)],
    });

    // At zoom=2, threshold is halved (POINT_HIT_THRESHOLD / zoom)
    // Point at distance 8 from handle: miss at zoom=2, hit at zoom=1
    expect(hitTestPointHandles(pointFrom<GlobalPoint>(108, 100), el, 2)).toBe(-1);
    expect(hitTestPointHandles(pointFrom<GlobalPoint>(108, 100), el, 1)).toBe(0);
  });

  it("prefers earlier point when overlapping", () => {
    const el = createTestArrowElement({
      x: 100,
      y: 100,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(5, 0)],
    });

    // Both points within threshold at zoom=1 — returns first
    expect(hitTestPointHandles(pointFrom<GlobalPoint>(102, 100), el, 1)).toBe(0);
  });
});

describe("hitTestMidpoints", () => {
  it("returns segment index of hit midpoint", () => {
    const el = createTestArrowElement({
      x: 0,
      y: 0,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 0)],
    });

    // Midpoint at (50, 0)
    expect(hitTestMidpoints(pointFrom<GlobalPoint>(50, 0), el, 1)).toBe(0);
  });

  it("returns -1 for miss", () => {
    const el = createTestArrowElement({
      x: 0,
      y: 0,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 0)],
    });

    expect(hitTestMidpoints(pointFrom<GlobalPoint>(25, 0), el, 1)).toBe(-1);
  });
});

describe("insertPointAtSegment", () => {
  it("inserts midpoint at segment index", () => {
    const points = [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 0)];
    const result = insertPointAtSegment(points, 0);

    expect(result.insertedIndex).toBe(1);
    expect(result.points).toEqual([
      [0, 0],
      [50, 0],
      [100, 0],
    ]);
  });

  it("inserts at correct position in multi-segment arrow", () => {
    const points = [
      pointFrom<LocalPoint>(0, 0),
      pointFrom<LocalPoint>(40, 0),
      pointFrom<LocalPoint>(40, 40),
    ];
    const result = insertPointAtSegment(points, 1);

    expect(result.insertedIndex).toBe(2);
    expect(result.points).toEqual([
      [0, 0],
      [40, 0],
      [40, 20],
      [40, 40],
    ]);
  });
});

describe("removePoints", () => {
  it("removes point by index", () => {
    const points = [
      pointFrom<LocalPoint>(0, 0),
      pointFrom<LocalPoint>(50, 0),
      pointFrom<LocalPoint>(100, 0),
    ];
    const result = removePoints(points, new Set([1]));

    expect(result).toEqual([
      [0, 0],
      [100, 0],
    ]);
  });

  it("returns null when removal would leave fewer than 2 points", () => {
    const points = [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 0)];
    const result = removePoints(points, new Set([0]));

    expect(result).toBeNull();
  });

  it("removes multiple points", () => {
    const points = [
      pointFrom<LocalPoint>(0, 0),
      pointFrom<LocalPoint>(25, 0),
      pointFrom<LocalPoint>(50, 0),
      pointFrom<LocalPoint>(100, 0),
    ];
    const result = removePoints(points, new Set([1, 2]));

    expect(result).toEqual([
      [0, 0],
      [100, 0],
    ]);
  });

  it("returns null when removing all but one", () => {
    const points = [
      pointFrom<LocalPoint>(0, 0),
      pointFrom<LocalPoint>(50, 0),
      pointFrom<LocalPoint>(100, 0),
    ];
    const result = removePoints(points, new Set([0, 1]));

    expect(result).toBeNull();
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

describe("movePoint", () => {
  it("moves a non-origin point without affecting element position", () => {
    const points = [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(50, 0)];
    const result = movePoint(100, 100, points, 1, 10, 5);

    expect(result.x).toBe(100);
    expect(result.y).toBe(100);
    expect(result.points[0]).toEqual([0, 0]);
    expect(result.points[1]).toEqual([60, 5]);
  });

  it("moves origin point and normalizes", () => {
    const points = [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(50, 0)];
    const result = movePoint(100, 100, points, 0, 10, 5);

    // Element position shifts by the origin point delta
    expect(result.x).toBe(110);
    expect(result.y).toBe(105);
    // Origin back to (0,0), other points offset
    expect(result.points[0]).toEqual([0, 0]);
    expect(result.points[1]).toEqual([40, -5]);
  });
});

describe("movePoints", () => {
  it("moves multiple selected points", () => {
    const points = [
      pointFrom<LocalPoint>(0, 0),
      pointFrom<LocalPoint>(50, 0),
      pointFrom<LocalPoint>(100, 0),
    ];
    const result = movePoints(0, 0, points, new Set([1, 2]), 0, 10);

    expect(result.points[0]).toEqual([0, 0]);
    expect(result.points[1]).toEqual([50, 10]);
    expect(result.points[2]).toEqual([100, 10]);
  });

  it("normalizes when origin point is included", () => {
    const points = [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(50, 0)];
    const result = movePoints(10, 20, points, new Set([0, 1]), 5, 5);

    // All points moved by same delta — element shifts, relative positions unchanged
    expect(result.x).toBe(15);
    expect(result.y).toBe(25);
    expect(result.points[0]).toEqual([0, 0]);
    expect(result.points[1]).toEqual([50, 0]);
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
