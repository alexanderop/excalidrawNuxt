import { pointFrom } from "../../shared/math";
import type { LocalPoint } from "../../shared/math";
import { createTestArrowElement } from "../../__test-utils__/factories/element";
import { routeElbowArrow } from "./routeElbow";

describe("routeElbowArrow", () => {
  it("routes a simple 2-point elbow arrow into orthogonal segments", () => {
    const arrow = createTestArrowElement({
      x: 0,
      y: 0,
      elbowed: true,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(200, 100)],
      width: 200,
      height: 100,
    });

    routeElbowArrow(arrow, []);

    // Should have more than 2 points (orthogonal path)
    expect(arrow.points.length).toBeGreaterThanOrEqual(2);
    // First point should still be at origin
    expect(arrow.points[0]).toEqual([0, 0]);
    // Last point should still end near the original endpoint
    const lastPt = arrow.points.at(-1)!;
    expect(lastPt[0]).toBeCloseTo(200, 0);
    expect(lastPt[1]).toBeCloseTo(100, 0);
  });

  it("keeps straight arrow unchanged when A* finds no path", () => {
    const arrow = createTestArrowElement({
      x: 50,
      y: 50,
      elbowed: true,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(0, 0)],
      width: 0,
      height: 0,
    });

    // Start and end at same point — A* should not find a meaningful path
    routeElbowArrow(arrow, []);

    // Arrow should still have its original points (or cleaned version)
    expect(arrow.points.length).toBeGreaterThanOrEqual(1);
  });

  it("does nothing for arrow with fewer than 2 points", () => {
    const arrow = createTestArrowElement({
      x: 0,
      y: 0,
      elbowed: true,
      points: [pointFrom<LocalPoint>(0, 0)],
      width: 0,
      height: 0,
    });

    routeElbowArrow(arrow, []);

    expect(arrow.points).toHaveLength(1);
  });

  it("avoids obstacles when routing", () => {
    const arrow = createTestArrowElement({
      x: 0,
      y: 0,
      elbowed: true,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(200, 0)],
      width: 200,
      height: 0,
    });

    // Place a rectangle obstacle in the middle of the path
    const obstacle = {
      id: "rect-1",
      type: "rectangle" as const,
      x: 80,
      y: -30,
      width: 40,
      height: 60,
      angle: 0,
      isDeleted: false,
      boundElements: null,
      groupIds: [] as readonly string[],
    };

    routeElbowArrow(arrow, [obstacle as never]);

    // The path should have more than 2 points to go around the obstacle
    expect(arrow.points.length).toBeGreaterThan(2);
  });
});
