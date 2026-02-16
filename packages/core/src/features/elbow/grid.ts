/* v8 ignore start -- Grid generation for A* pathfinding; covered by core unit tests (grid.unit.test.ts) */
/**
 * Non-uniform grid for A* pathfinding.
 *
 * Grid lines are placed at obstacle AABB edges, start/end constraint
 * points, and the common bounding box edges. This produces a
 * variable-resolution grid that naturally snaps to obstacle boundaries.
 *
 * Reference: excalidraw/packages/element/src/elbowArrow.ts ~line 1847
 */

import { pointFrom } from "../../shared/math";
import type { GlobalPoint } from "../../shared/math";
import type { Bounds } from "../selection/bounds";
import type { Heading } from "../binding/heading";
import { HEADING_LEFT, HEADING_RIGHT } from "../binding/heading";

// ---------------------------------------------------------------------------
// Grid types
// ---------------------------------------------------------------------------

export type GridAddress = [col: number, row: number];

export interface Node {
  f: number;
  g: number;
  h: number;
  closed: boolean;
  visited: boolean;
  parent: Node | null;
  pos: GlobalPoint;
  addr: GridAddress;
}

export interface Grid {
  row: number;
  col: number;
  data: (Node | null)[];
}

// ---------------------------------------------------------------------------
// Grid construction
// ---------------------------------------------------------------------------

/**
 * Build a non-uniform grid from obstacle AABBs and start/end points.
 *
 * Grid lines are placed at:
 * - Start/end constraint points (based on heading direction)
 * - All obstacle AABB edges (left, right, top, bottom)
 * - Common bounding box edges
 */
export function calculateGrid(
  aabbs: readonly Bounds[],
  start: GlobalPoint,
  startHeading: Heading,
  end: GlobalPoint,
  endHeading: Heading,
  common: Bounds,
): Grid {
  const horizontal = new Set<number>();
  const vertical = new Set<number>();

  // Always add start/end coordinates so they are findable on the grid.
  horizontal.add(start[0]);
  horizontal.add(end[0]);
  vertical.add(start[1]);
  vertical.add(end[1]);

  // Add heading-based constraints (matching Excalidraw behavior).
  // Horizontal headings emphasize Y; vertical headings emphasize X.
  if (startHeading === HEADING_LEFT || startHeading === HEADING_RIGHT) {
    vertical.add(start[1]);
  }
  if (!(startHeading === HEADING_LEFT || startHeading === HEADING_RIGHT)) {
    horizontal.add(start[0]);
  }
  if (endHeading === HEADING_LEFT || endHeading === HEADING_RIGHT) {
    vertical.add(end[1]);
  }
  if (!(endHeading === HEADING_LEFT || endHeading === HEADING_RIGHT)) {
    horizontal.add(end[0]);
  }

  // Add all obstacle AABB edges
  for (const aabb of aabbs) {
    horizontal.add(aabb[0]);
    horizontal.add(aabb[2]);
    vertical.add(aabb[1]);
    vertical.add(aabb[3]);
  }

  // Add common bounding box edges
  horizontal.add(common[0]);
  horizontal.add(common[2]);
  vertical.add(common[1]);
  vertical.add(common[3]);

  const sortedVertical = [...vertical].toSorted((a, b) => a - b);
  const sortedHorizontal = [...horizontal].toSorted((a, b) => a - b);

  return {
    row: sortedVertical.length,
    col: sortedHorizontal.length,
    data: sortedVertical.flatMap((y, row) =>
      sortedHorizontal.map(
        (x, col): Node => ({
          f: 0,
          g: 0,
          h: 0,
          closed: false,
          visited: false,
          parent: null,
          addr: [col, row] as GridAddress,
          pos: pointFrom<GlobalPoint>(x, y),
        }),
      ),
    ),
  };
}

// ---------------------------------------------------------------------------
// Grid utilities
// ---------------------------------------------------------------------------

/** Look up a grid node by column and row address. */
export function gridNodeFromAddr([col, row]: [col: number, row: number], grid: Grid): Node | null {
  if (col < 0 || col >= grid.col || row < 0 || row >= grid.row) {
    return null;
  }
  return grid.data[row * grid.col + col] ?? null;
}

/** Get the 4 neighbors (up, right, down, left) of a grid address. */
export function getNeighbors(
  [col, row]: GridAddress,
  grid: Grid,
): [Node | null, Node | null, Node | null, Node | null] {
  return [
    gridNodeFromAddr([col, row - 1], grid), // UP
    gridNodeFromAddr([col + 1, row], grid), // RIGHT
    gridNodeFromAddr([col, row + 1], grid), // DOWN
    gridNodeFromAddr([col - 1, row], grid), // LEFT
  ];
}

/** Find the grid node that matches an exact global point. */
export function pointToGridNode(point: GlobalPoint, grid: Grid): Node | null {
  for (let col = 0; col < grid.col; col++) {
    for (let row = 0; row < grid.row; row++) {
      const candidate = gridNodeFromAddr([col, row], grid);
      if (candidate && point[0] === candidate.pos[0] && point[1] === candidate.pos[1]) {
        return candidate;
      }
    }
  }
  return null;
}

/** Compute the common AABB that contains all given bounds. */
export function commonAABB(aabbs: readonly Bounds[]): Bounds {
  return [
    Math.min(...aabbs.map((aabb) => aabb[0])),
    Math.min(...aabbs.map((aabb) => aabb[1])),
    Math.max(...aabbs.map((aabb) => aabb[2])),
    Math.max(...aabbs.map((aabb) => aabb[3])),
  ];
}

/** Check if two grid addresses point to the same cell. */
export function gridAddressesEqual(a: GridAddress, b: GridAddress): boolean {
  return a[0] === b[0] && a[1] === b[1];
}
