/**
 * Modified A* pathfinding for elbow arrow routing.
 *
 * Uses Manhattan distance heuristic with heavy bend penalties
 * to produce aesthetically pleasing orthogonal paths.
 *
 * Reference: excalidraw/packages/element/src/elbowArrow.ts ~line 1531
 */

import { pointScaleFromOrigin } from "../../shared/math";
import type { GlobalPoint } from "../../shared/math";
import { vectorFromPoint } from "../../shared/math";
import type { Bounds } from "../selection/bounds";
import type { Heading } from "../binding/heading";
import {
  compareHeading,
  flipHeading,
  vectorToHeading,
  HEADING_UP,
  HEADING_RIGHT,
  HEADING_DOWN,
  HEADING_LEFT,
} from "../binding/heading";
import type { Node, Grid } from "./grid";
import { getNeighbors, gridAddressesEqual } from "./grid";

// ---------------------------------------------------------------------------
// Manhattan distance
// ---------------------------------------------------------------------------

function mDist(a: GlobalPoint, b: GlobalPoint): number {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
}

// ---------------------------------------------------------------------------
// Segment count estimation (heuristic for bend penalties)
// ---------------------------------------------------------------------------

function neighborIndexToHeading(idx: 0 | 1 | 2 | 3): Heading {
  if (idx === 0) return HEADING_UP;
  if (idx === 1) return HEADING_RIGHT;
  if (idx === 2) return HEADING_DOWN;
  return HEADING_LEFT;
}

/**
 * Estimate how many bends are needed between two nodes given their headings.
 * Used by the heuristic to penalize paths with expected turns.
 */
function estimateSegmentCount(
  start: Node,
  end: Node,
  startHeading: Heading,
  endHeading: Heading,
): number {
  if (endHeading === HEADING_RIGHT) return estimateForEndRight(start, end, startHeading);
  if (endHeading === HEADING_LEFT) return estimateForEndLeft(start, end, startHeading);
  if (endHeading === HEADING_UP) return estimateForEndUp(start, end, startHeading);
  return estimateForEndDown(start, end, startHeading);
}

/**
 * When start and end headings align on the same axis (same or opposite direction),
 * estimate bends based on whether the start has "passed" the end or is aligned.
 *
 * - sameDir: start heading === end heading
 * - primaryCoord: the axis of travel (x for horizontal, y for vertical)
 * - secondaryCoord: the perpendicular axis
 * - pastThreshold: whether start has passed end on the primary axis (needs U-turn)
 */
function estimateSameAxis(
  startPos: GlobalPoint,
  endPos: GlobalPoint,
  sameDir: boolean,
  primaryIdx: 0 | 1,
  secondaryIdx: 0 | 1,
  pastCheck: (start: number, end: number) => boolean,
): number {
  if (sameDir) {
    if (pastCheck(startPos[primaryIdx], endPos[primaryIdx])) return 4;
    if (startPos[secondaryIdx] === endPos[secondaryIdx]) return 0;
    return 2;
  }
  // Opposite direction
  if (startPos[secondaryIdx] === endPos[secondaryIdx]) return 4;
  return 2;
}

/**
 * When start heading is perpendicular to end heading,
 * check if the path can make a single 90-degree turn.
 */
function estimatePerpendicular(
  startPos: GlobalPoint,
  endPos: GlobalPoint,
  favorableCheck: (start: GlobalPoint, end: GlobalPoint) => boolean,
): number {
  if (favorableCheck(startPos, endPos)) return 1;
  return 3;
}

function estimateForEndRight(start: Node, end: Node, startHeading: Heading): number {
  if (startHeading === HEADING_RIGHT || startHeading === HEADING_LEFT) {
    return estimateSameAxis(
      start.pos,
      end.pos,
      startHeading === HEADING_RIGHT,
      0,
      1,
      (s, e) => s >= e,
    );
  }
  if (startHeading === HEADING_UP) {
    return estimatePerpendicular(start.pos, end.pos, (s, e) => s[1] > e[1] && s[0] < e[0]);
  }
  return estimatePerpendicular(start.pos, end.pos, (s, e) => s[1] < e[1] && s[0] < e[0]);
}

function estimateForEndLeft(start: Node, end: Node, startHeading: Heading): number {
  if (startHeading === HEADING_RIGHT || startHeading === HEADING_LEFT) {
    return estimateSameAxis(
      start.pos,
      end.pos,
      startHeading === HEADING_LEFT,
      0,
      1,
      (s, e) => s <= e,
    );
  }
  if (startHeading === HEADING_UP) {
    return estimatePerpendicular(start.pos, end.pos, (s, e) => s[1] > e[1] && s[0] > e[0]);
  }
  return estimatePerpendicular(start.pos, end.pos, (s, e) => s[1] < e[1] && s[0] > e[0]);
}

function estimateForEndUp(start: Node, end: Node, startHeading: Heading): number {
  if (startHeading === HEADING_UP || startHeading === HEADING_DOWN) {
    return estimateSameAxis(
      start.pos,
      end.pos,
      startHeading === HEADING_UP,
      1,
      0,
      (s, e) => s >= e,
    );
  }
  if (startHeading === HEADING_RIGHT) {
    return estimatePerpendicular(start.pos, end.pos, (s, e) => s[1] > e[1] && s[0] < e[0]);
  }
  return estimatePerpendicular(start.pos, end.pos, (s, e) => s[1] > e[1] && s[0] > e[0]);
}

function estimateForEndDown(start: Node, end: Node, startHeading: Heading): number {
  if (startHeading === HEADING_UP || startHeading === HEADING_DOWN) {
    return estimateSameAxis(
      start.pos,
      end.pos,
      startHeading === HEADING_DOWN,
      1,
      0,
      (s, e) => s <= e,
    );
  }
  if (startHeading === HEADING_RIGHT) {
    return estimatePerpendicular(start.pos, end.pos, (s, e) => s[1] < e[1] && s[0] < e[0]);
  }
  return estimatePerpendicular(start.pos, end.pos, (s, e) => s[1] < e[1] && s[0] > e[0]);
}

// ---------------------------------------------------------------------------
// Binary min-heap (for A* open set)
// ---------------------------------------------------------------------------

class BinaryHeap {
  private content: Node[] = [];

  size(): number {
    return this.content.length;
  }

  push(node: Node): void {
    this.content.push(node);
    this.sinkDown(this.content.length - 1);
  }

  pop(): Node | undefined {
    const first = this.content[0];
    const last = this.content.pop();
    if (this.content.length > 0 && last) {
      this.content[0] = last;
      this.bubbleUp(0);
    }
    return first;
  }

  rescoreElement(node: Node): void {
    const idx = this.content.indexOf(node);
    if (idx !== -1) {
      this.sinkDown(idx);
    }
  }

  private sinkDown(idx: number): void {
    const element = this.content[idx]!;
    while (idx > 0) {
      const parentIdx = ((idx + 1) >> 1) - 1;
      const parent = this.content[parentIdx]!;
      if (element.f < parent.f) {
        this.content[parentIdx] = element;
        this.content[idx] = parent;
        idx = parentIdx;
      }
      if (!(element.f < parent.f)) {
        break;
      }
    }
  }

  private bubbleUp(idx: number): void {
    const length = this.content.length;
    const element = this.content[idx]!;

    for (;;) {
      const child2Idx = (idx + 1) << 1;
      const child1Idx = child2Idx - 1;
      let swap: number | null = null;

      if (child1Idx < length) {
        const child1 = this.content[child1Idx]!;
        if (child1.f < element.f) {
          swap = child1Idx;
        }
      }

      if (child2Idx < length) {
        const child2 = this.content[child2Idx]!;
        if (child2.f < (swap === null ? element.f : this.content[swap]!.f)) {
          swap = child2Idx;
        }
      }

      if (swap === null) break;

      this.content[idx] = this.content[swap]!;
      this.content[swap] = element;
      idx = swap;
    }
  }
}

// ---------------------------------------------------------------------------
// Obstacle collision helper
// ---------------------------------------------------------------------------

/** Check if a point falls inside any of the given AABBs. */
function pointInsideBounds(p: GlobalPoint, bounds: Bounds): boolean {
  return p[0] >= bounds[0] && p[0] <= bounds[2] && p[1] >= bounds[1] && p[1] <= bounds[3];
}

// ---------------------------------------------------------------------------
// A* algorithm
// ---------------------------------------------------------------------------

/** Trace path from start to end by following parent links. */
function pathTo(start: Node, node: Node): Node[] {
  let curr = node;
  const path: Node[] = [];
  while (curr.parent) {
    path.unshift(curr);
    curr = curr.parent;
  }
  path.unshift(start);
  return path;
}

/**
 * Run A* pathfinding on the given grid.
 *
 * Cost function:
 * - g-score: actual cost from start, with bend penalty (bendMultiplier^3)
 * - h-score: Manhattan distance to end + estimated bends * bendMultiplier^2
 * - bendMultiplier = Manhattan distance between start and end
 *
 * Constraints:
 * - No backtracking (reverse direction forbidden)
 * - Midpoint collision test against obstacle AABBs
 *
 * Returns array of nodes forming the path, or null if no path found.
 */
/** Check if moving to this neighbor constitutes backtracking. */
function isReverseRoute(
  neighborHeading: Heading,
  previousDirection: Heading,
  neighbor: Node,
  start: Node,
  end: Node,
  startHeading: Heading,
  endHeading: Heading,
): boolean {
  const reverseHeading = flipHeading(previousDirection);
  if (compareHeading(reverseHeading, neighborHeading)) return true;
  if (
    gridAddressesEqual(start.addr, neighbor.addr) &&
    compareHeading(neighborHeading, startHeading)
  )
    return true;
  if (gridAddressesEqual(end.addr, neighbor.addr) && compareHeading(neighborHeading, endHeading))
    return true;
  return false;
}

/** Process a single neighbor in the A* loop. */
function processNeighbor(
  current: Node,
  neighbor: Node,
  neighborIdx: 0 | 1 | 2 | 3,
  start: Node,
  end: Node,
  startHeading: Heading,
  endHeading: Heading,
  bendMultiplier: number,
  aabbs: readonly Bounds[],
  open: BinaryHeap,
): void {
  // Midpoint collision test
  const neighborHalfPoint = pointScaleFromOrigin(neighbor.pos, current.pos, 0.5) as GlobalPoint;
  if (aabbs.some((aabb) => pointInsideBounds(neighborHalfPoint, aabb))) return;

  // Direction checks
  const neighborHeading = neighborIndexToHeading(neighborIdx);
  const previousDirection = current.parent
    ? vectorToHeading(vectorFromPoint(current.pos, current.parent.pos))
    : startHeading;

  if (
    isReverseRoute(
      neighborHeading,
      previousDirection,
      neighbor,
      start,
      end,
      startHeading,
      endHeading,
    )
  )
    return;

  // Cost calculation
  const directionChange = !compareHeading(previousDirection, neighborHeading);
  const gScore =
    current.g +
    mDist(neighbor.pos, current.pos) +
    (directionChange ? Math.pow(bendMultiplier, 3) : 0);

  const beenVisited = neighbor.visited;
  if (beenVisited && gScore >= neighbor.g) return;

  const estBendCount = estimateSegmentCount(neighbor, end, neighborHeading, endHeading);
  neighbor.visited = true;
  neighbor.parent = current;
  neighbor.h = mDist(end.pos, neighbor.pos) + estBendCount * Math.pow(bendMultiplier, 2);
  neighbor.g = gScore;
  neighbor.f = neighbor.g + neighbor.h;

  if (beenVisited) {
    open.rescoreElement(neighbor);
    return;
  }
  open.push(neighbor);
}

export function astar(
  start: Node,
  end: Node,
  grid: Grid,
  startHeading: Heading,
  endHeading: Heading,
  aabbs: readonly Bounds[],
): GlobalPoint[] | null {
  const bendMultiplier = mDist(start.pos, end.pos);
  const open = new BinaryHeap();

  open.push(start);

  while (open.size() > 0) {
    const current = open.pop();

    if (!current || current.closed) continue;

    if (current === end) {
      return pathTo(start, current).map((n) => n.pos);
    }

    current.closed = true;

    const neighbors = getNeighbors(current.addr, grid);

    for (let i = 0; i < 4; i++) {
      const neighbor = neighbors[i];
      if (!neighbor || neighbor.closed) continue;
      processNeighbor(
        current,
        neighbor,
        i as 0 | 1 | 2 | 3,
        start,
        end,
        startHeading,
        endHeading,
        bendMultiplier,
        aabbs,
        open,
      );
    }
  }

  return null;
}
