import { pointFrom } from "../../shared/math";
import type { GlobalPoint } from "../../shared/math";
import type { Bounds } from "../selection/bounds";
import { HEADING_RIGHT, HEADING_DOWN, HEADING_LEFT, HEADING_UP } from "../binding/heading";
import {
  calculateGrid,
  gridNodeFromAddr,
  getNeighbors,
  pointToGridNode,
  commonAABB,
  gridAddressesEqual,
} from "./grid";

describe("grid", () => {
  describe("calculateGrid", () => {
    it("creates a grid with correct dimensions from obstacle AABBs", () => {
      const obstacle: Bounds = [50, 50, 150, 150];
      const start = pointFrom<GlobalPoint>(0, 100);
      const end = pointFrom<GlobalPoint>(200, 100);
      const common: Bounds = [-10, -10, 210, 210];

      const grid = calculateGrid([obstacle], start, HEADING_RIGHT, end, HEADING_LEFT, common);

      // The grid should have multiple columns and rows from all the edges
      expect(grid.row).toBeGreaterThan(0);
      expect(grid.col).toBeGreaterThan(0);
      expect(grid.data).toHaveLength(grid.row * grid.col);
    });

    it("includes obstacle AABB edges in grid lines", () => {
      const obstacle: Bounds = [50, 50, 150, 150];
      const start = pointFrom<GlobalPoint>(0, 100);
      const end = pointFrom<GlobalPoint>(200, 100);
      const common: Bounds = [0, 0, 200, 200];

      const grid = calculateGrid([obstacle], start, HEADING_RIGHT, end, HEADING_LEFT, common);

      // Find all unique X positions in grid
      const xPositions = new Set<number>();
      for (const node of grid.data) {
        if (node) xPositions.add(node.pos[0]);
      }

      // Obstacle edges should be represented
      expect(xPositions.has(50)).toBe(true);
      expect(xPositions.has(150)).toBe(true);
    });

    it("includes common bounding box edges", () => {
      const common: Bounds = [-10, -10, 210, 210];
      const start = pointFrom<GlobalPoint>(0, 0);
      const end = pointFrom<GlobalPoint>(200, 200);

      const grid = calculateGrid([], start, HEADING_DOWN, end, HEADING_UP, common);

      const xPositions = new Set<number>();
      const yPositions = new Set<number>();
      for (const node of grid.data) {
        if (node) {
          xPositions.add(node.pos[0]);
          yPositions.add(node.pos[1]);
        }
      }

      expect(xPositions.has(-10)).toBe(true);
      expect(xPositions.has(210)).toBe(true);
      expect(yPositions.has(-10)).toBe(true);
      expect(yPositions.has(210)).toBe(true);
    });

    it("adds start/end Y constraints for horizontal headings", () => {
      const start = pointFrom<GlobalPoint>(0, 75);
      const end = pointFrom<GlobalPoint>(200, 125);
      const common: Bounds = [0, 0, 200, 200];

      const grid = calculateGrid([], start, HEADING_RIGHT, end, HEADING_LEFT, common);

      const yPositions = new Set<number>();
      for (const node of grid.data) {
        if (node) yPositions.add(node.pos[1]);
      }

      expect(yPositions.has(75)).toBe(true);
      expect(yPositions.has(125)).toBe(true);
    });

    it("adds start/end X constraints for vertical headings", () => {
      const start = pointFrom<GlobalPoint>(75, 0);
      const end = pointFrom<GlobalPoint>(125, 200);
      const common: Bounds = [0, 0, 200, 200];

      const grid = calculateGrid([], start, HEADING_DOWN, end, HEADING_UP, common);

      const xPositions = new Set<number>();
      for (const node of grid.data) {
        if (node) xPositions.add(node.pos[0]);
      }

      expect(xPositions.has(75)).toBe(true);
      expect(xPositions.has(125)).toBe(true);
    });

    it("initializes all nodes with zeroed scores", () => {
      const grid = calculateGrid(
        [],
        pointFrom<GlobalPoint>(0, 0),
        HEADING_RIGHT,
        pointFrom<GlobalPoint>(100, 100),
        HEADING_LEFT,
        [0, 0, 100, 100],
      );

      const nodes = grid.data.filter((n): n is NonNullable<typeof n> => n !== null);
      expect(nodes.length).toBeGreaterThan(0);

      for (const node of nodes) {
        expect(node.f).toBe(0);
        expect(node.g).toBe(0);
        expect(node.h).toBe(0);
        expect(node.closed).toBe(false);
        expect(node.visited).toBe(false);
        expect(node.parent).toBeNull();
      }
    });
  });

  describe("gridNodeFromAddr", () => {
    it("returns the node at the given address", () => {
      const grid = calculateGrid(
        [],
        pointFrom<GlobalPoint>(0, 0),
        HEADING_RIGHT,
        pointFrom<GlobalPoint>(100, 100),
        HEADING_LEFT,
        [0, 0, 100, 100],
      );

      const node = gridNodeFromAddr([0, 0], grid);
      expect(node).not.toBeNull();
      expect(node!.addr).toEqual([0, 0]);
    });

    it("returns null for out-of-bounds addresses", () => {
      const grid = calculateGrid(
        [],
        pointFrom<GlobalPoint>(0, 0),
        HEADING_RIGHT,
        pointFrom<GlobalPoint>(100, 100),
        HEADING_LEFT,
        [0, 0, 100, 100],
      );

      expect(gridNodeFromAddr([-1, 0], grid)).toBeNull();
      expect(gridNodeFromAddr([0, -1], grid)).toBeNull();
      expect(gridNodeFromAddr([grid.col, 0], grid)).toBeNull();
      expect(gridNodeFromAddr([0, grid.row], grid)).toBeNull();
    });
  });

  describe("getNeighbors", () => {
    it("returns 4 neighbors for a center node", () => {
      const grid = calculateGrid(
        [[20, 20, 80, 80]],
        pointFrom<GlobalPoint>(0, 50),
        HEADING_RIGHT,
        pointFrom<GlobalPoint>(100, 50),
        HEADING_LEFT,
        [0, 0, 100, 100],
      );

      // Pick a node near the center
      const centerAddr = [Math.floor(grid.col / 2), Math.floor(grid.row / 2)] as [number, number];
      const neighbors = getNeighbors(centerAddr, grid);

      // At least some neighbors should exist
      const nonNullCount = neighbors.filter((n) => n !== null).length;
      expect(nonNullCount).toBeGreaterThan(0);
    });

    it("returns null for neighbors outside grid bounds", () => {
      const grid = calculateGrid(
        [],
        pointFrom<GlobalPoint>(0, 0),
        HEADING_RIGHT,
        pointFrom<GlobalPoint>(100, 100),
        HEADING_LEFT,
        [0, 0, 100, 100],
      );

      // Top-left corner: UP and LEFT neighbors should be null
      const neighbors = getNeighbors([0, 0], grid);
      expect(neighbors[0]).toBeNull(); // UP
      expect(neighbors[3]).toBeNull(); // LEFT
    });
  });

  describe("pointToGridNode", () => {
    it("finds a node matching an exact grid point", () => {
      const common: Bounds = [0, 0, 100, 100];
      const grid = calculateGrid(
        [],
        pointFrom<GlobalPoint>(0, 0),
        HEADING_DOWN,
        pointFrom<GlobalPoint>(100, 100),
        HEADING_UP,
        common,
      );

      // The common bounds edges should be in the grid
      const node = pointToGridNode(pointFrom<GlobalPoint>(0, 0), grid);
      expect(node).not.toBeNull();
      expect(node!.pos[0]).toBe(0);
      expect(node!.pos[1]).toBe(0);
    });

    it("returns null for a point not on the grid", () => {
      const grid = calculateGrid(
        [],
        pointFrom<GlobalPoint>(0, 0),
        HEADING_RIGHT,
        pointFrom<GlobalPoint>(100, 100),
        HEADING_LEFT,
        [0, 0, 100, 100],
      );

      const node = pointToGridNode(pointFrom<GlobalPoint>(37.5, 37.5), grid);
      expect(node).toBeNull();
    });
  });

  describe("commonAABB", () => {
    it("computes the enclosing AABB of multiple bounds", () => {
      const aabbs: Bounds[] = [
        [10, 20, 50, 60],
        [30, 10, 80, 40],
      ];
      expect(commonAABB(aabbs)).toEqual([10, 10, 80, 60]);
    });

    it("returns the same bounds for a single AABB", () => {
      const aabb: Bounds = [10, 20, 30, 40];
      expect(commonAABB([aabb])).toEqual(aabb);
    });
  });

  describe("gridAddressesEqual", () => {
    it("returns true for identical addresses", () => {
      expect(gridAddressesEqual([1, 2], [1, 2])).toBe(true);
    });

    it("returns false for different addresses", () => {
      expect(gridAddressesEqual([1, 2], [2, 1])).toBe(false);
    });
  });
});
