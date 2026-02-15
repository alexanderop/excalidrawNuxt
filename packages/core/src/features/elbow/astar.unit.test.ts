import { pointFrom } from "../../shared/math";
import type { GlobalPoint } from "../../shared/math";
import type { Bounds } from "../selection/bounds";
import { HEADING_RIGHT, HEADING_DOWN, HEADING_LEFT, HEADING_UP } from "../binding/heading";
import { calculateGrid, pointToGridNode } from "./grid";
import { astar } from "./astar";

/**
 * Helper: run A* between two points with given obstacles and headings.
 * Builds a grid, locates start/end nodes, and runs the algorithm.
 */
function routePath(
  startPos: GlobalPoint,
  endPos: GlobalPoint,
  startHeading: typeof HEADING_RIGHT,
  endHeading: typeof HEADING_LEFT,
  obstacles: Bounds[] = [],
  padding = 40,
): GlobalPoint[] | null {
  // Build a common bounding box that encompasses everything with padding
  let minX = Math.min(startPos[0], endPos[0]);
  let minY = Math.min(startPos[1], endPos[1]);
  let maxX = Math.max(startPos[0], endPos[0]);
  let maxY = Math.max(startPos[1], endPos[1]);

  for (const obs of obstacles) {
    minX = Math.min(minX, obs[0]);
    minY = Math.min(minY, obs[1]);
    maxX = Math.max(maxX, obs[2]);
    maxY = Math.max(maxY, obs[3]);
  }

  const common: Bounds = [minX - padding, minY - padding, maxX + padding, maxY + padding];

  const grid = calculateGrid(obstacles, startPos, startHeading, endPos, endHeading, common);

  const startNode = pointToGridNode(startPos, grid);
  const endNode = pointToGridNode(endPos, grid);

  if (!startNode || !endNode) return null;

  return astar(startNode, endNode, grid, startHeading, endHeading, obstacles);
}

describe("astar", () => {
  it("finds a straight path when start and end are aligned horizontally", () => {
    const start = pointFrom<GlobalPoint>(0, 0);
    const end = pointFrom<GlobalPoint>(100, 0);

    const path = routePath(start, end, HEADING_RIGHT, HEADING_LEFT);

    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThanOrEqual(2);
    expect(path![0]![0]).toBe(0);
    expect(path![0]![1]).toBe(0);
    expect(path![path!.length - 1]![0]).toBe(100);
    expect(path![path!.length - 1]![1]).toBe(0);
  });

  it("returns a path that includes start and end positions", () => {
    const start = pointFrom<GlobalPoint>(0, 0);
    const end = pointFrom<GlobalPoint>(100, 100);

    const path = routePath(start, end, HEADING_RIGHT, HEADING_LEFT);

    expect(path).not.toBeNull();
    expect(path![0]).toEqual(start);
    expect(path![path!.length - 1]).toEqual(end);
  });

  it("produces orthogonal segments (only horizontal or vertical)", () => {
    const start = pointFrom<GlobalPoint>(0, 0);
    const end = pointFrom<GlobalPoint>(100, 100);

    const path = routePath(start, end, HEADING_RIGHT, HEADING_LEFT);

    expect(path).not.toBeNull();
    for (let i = 1; i < path!.length; i++) {
      const dx = path![i]![0] - path![i - 1]![0];
      const dy = path![i]![1] - path![i - 1]![1];
      // Each segment should be purely H or V
      expect(dx === 0 || dy === 0).toBe(true);
    }
  });

  it("routes around an obstacle in the middle", () => {
    const start = pointFrom<GlobalPoint>(0, 50);
    const end = pointFrom<GlobalPoint>(200, 50);
    const obstacle: Bounds = [80, 20, 120, 80];

    const path = routePath(start, end, HEADING_RIGHT, HEADING_LEFT, [obstacle]);

    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThan(2);

    // Path should not pass through the obstacle midpoint
    for (let i = 1; i < path!.length; i++) {
      const midX = (path![i]![0] + path![i - 1]![0]) / 2;
      const midY = (path![i]![1] + path![i - 1]![1]) / 2;
      const insideObstacle =
        midX >= obstacle[0] && midX <= obstacle[2] && midY >= obstacle[1] && midY <= obstacle[3];
      expect(insideObstacle).toBe(false);
    }
  });

  it("returns null when start or end are not on the grid", () => {
    const start = pointFrom<GlobalPoint>(0.5, 0.5);
    const end = pointFrom<GlobalPoint>(100.5, 100.5);
    const common: Bounds = [0, 0, 100, 100];

    const grid = calculateGrid([], start, HEADING_RIGHT, end, HEADING_LEFT, common);

    // These fractional points likely won't be on the integer grid
    const startNode = pointToGridNode(pointFrom<GlobalPoint>(999, 999), grid);
    expect(startNode).toBeNull();
  });

  it("handles vertical-to-vertical routing", () => {
    const start = pointFrom<GlobalPoint>(50, 0);
    const end = pointFrom<GlobalPoint>(50, 200);

    const path = routePath(start, end, HEADING_DOWN, HEADING_UP);

    expect(path).not.toBeNull();
    // For aligned vertical points, should find a direct path
    expect(path!.length).toBeGreaterThanOrEqual(2);
  });

  it("handles routing with multiple obstacles", () => {
    const start = pointFrom<GlobalPoint>(0, 50);
    const end = pointFrom<GlobalPoint>(300, 50);
    const obstacles: Bounds[] = [
      [80, 20, 120, 80],
      [180, 20, 220, 80],
    ];

    const path = routePath(start, end, HEADING_RIGHT, HEADING_LEFT, obstacles);

    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThan(2);
  });
});
