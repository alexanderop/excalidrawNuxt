/**
 * High-level orchestrator for elbow arrow A* routing.
 *
 * Given an arrow with start/end points (and optional shape bindings),
 * computes the orthogonal middle path via A* and updates the arrow's points.
 */

import { pointFrom, vectorFromPoint } from "../../shared/math";
import type { GlobalPoint, LocalPoint } from "../../shared/math";
import type { ExcalidrawArrowElement, ExcalidrawElement } from "../elements/types";
import { isLinearElement } from "../elements/types";
import { mutateElement } from "../elements/mutateElement";
import { getElementBounds, type Bounds } from "../selection/bounds";
import { findBindableElement } from "../binding/bindUnbind";
import { headingForPointFromElement, vectorToHeading } from "../binding/heading";
import type { Heading } from "../binding/heading";
import { HEADING_RIGHT } from "../binding/heading";
import { calculateGrid, pointToGridNode, commonAABB } from "./grid";
import { astar } from "./astar";
import { removeShortSegments, getCornerPoints } from "./validation";
import { BASE_PADDING } from "./constants";
import { getSizeFromPoints } from "../linear-editor/pointHandles";

/**
 * Route an elbow arrow through A* pathfinding.
 *
 * 1. Collects obstacle AABBs from scene elements (excluding the arrow itself and bound shapes)
 * 2. Determines start/end headings from bound shapes or drag direction
 * 3. Builds non-uniform grid and runs A*
 * 4. Validates/cleans the path and updates arrow points
 */
export function routeElbowArrow(
  arrow: ExcalidrawArrowElement,
  elements: readonly ExcalidrawElement[],
): void {
  if (arrow.points.length < 2) return;

  const startPt = pointFrom<GlobalPoint>(arrow.x, arrow.y);
  const lastLocal = arrow.points.at(-1)!;
  const endPt = pointFrom<GlobalPoint>(arrow.x + lastLocal[0], arrow.y + lastLocal[1]);

  // Collect bound shapes (excluded from obstacles)
  const boundIds = new Set<string>();
  if (arrow.startBinding) boundIds.add(arrow.startBinding.elementId);
  if (arrow.endBinding) boundIds.add(arrow.endBinding.elementId);

  // Determine headings
  const startHeading = getStartHeading(arrow, startPt, endPt, elements);
  const endHeading = getEndHeading(arrow, startPt, endPt, elements);

  // Collect obstacle AABBs (non-arrow, non-deleted, non-bound elements)
  const obstacleAABBs: Bounds[] = [];
  for (const el of elements) {
    if (el.isDeleted) continue;
    if (el.id === arrow.id) continue;
    if (boundIds.has(el.id)) continue;
    if (isLinearElement(el)) continue;
    obstacleAABBs.push(getElementBounds(el));
  }

  // Pad start/end to give room for the first/last orthogonal segment
  const paddedStart = applyHeadingPadding(startPt, startHeading);
  const paddedEnd = applyHeadingPadding(endPt, endHeading);

  // Common AABB for grid bounds
  const allAABBs: Bounds[] = [
    ...obstacleAABBs,
    [
      Math.min(paddedStart[0], paddedEnd[0]) - BASE_PADDING,
      Math.min(paddedStart[1], paddedEnd[1]) - BASE_PADDING,
      Math.max(paddedStart[0], paddedEnd[0]) + BASE_PADDING,
      Math.max(paddedStart[1], paddedEnd[1]) + BASE_PADDING,
    ],
  ];
  const common = commonAABB(allAABBs);

  // Build grid and run A*
  const grid = calculateGrid(
    obstacleAABBs,
    paddedStart,
    startHeading,
    paddedEnd,
    endHeading,
    common,
  );

  const startNode = pointToGridNode(paddedStart, grid);
  const endNode = pointToGridNode(paddedEnd, grid);

  if (!startNode || !endNode) {
    // Fallback: keep as straight 2-point arrow
    return;
  }

  const rawPath = astar(startNode, endNode, grid, startHeading, endHeading, obstacleAABBs);

  if (!rawPath || rawPath.length < 2) {
    // A* found no path — keep as straight
    return;
  }

  // Prepend the actual start and append the actual end (unpadded)
  const fullPath = [startPt, ...rawPath, endPt];

  // Clean up: remove short segments and extract corners
  const cleaned = removeShortSegments(fullPath);
  const corners = getCornerPoints(cleaned);

  if (corners.length < 2) return;

  // Convert to local points (relative to arrow.x, arrow.y)
  const localPoints = corners.map((p) => pointFrom<LocalPoint>(p[0] - arrow.x, p[1] - arrow.y));

  // Update arrow
  const dims = getSizeFromPoints(localPoints);
  mutateElement(arrow, {
    points: localPoints,
    width: dims.width,
    height: dims.height,
  });
}

/** Apply BASE_PADDING offset in the heading direction. */
function applyHeadingPadding(point: GlobalPoint, heading: Heading): GlobalPoint {
  return pointFrom<GlobalPoint>(
    point[0] + heading[0] * BASE_PADDING,
    point[1] + heading[1] * BASE_PADDING,
  );
}

/** Get start heading: from bound shape if available, else from drag direction. */
function getStartHeading(
  arrow: ExcalidrawArrowElement,
  startPt: GlobalPoint,
  endPt: GlobalPoint,
  elements: readonly ExcalidrawElement[],
): Heading {
  if (arrow.startBinding) {
    const shape = findBindableElement(arrow.startBinding.elementId, elements);
    if (shape) {
      return headingForPointFromElement(shape, getElementBounds(shape), startPt);
    }
  }
  // Default: heading from start toward end
  return directionHeading(startPt, endPt);
}

/** Get end heading: from bound shape if available, else from drag direction. */
function getEndHeading(
  arrow: ExcalidrawArrowElement,
  startPt: GlobalPoint,
  endPt: GlobalPoint,
  elements: readonly ExcalidrawElement[],
): Heading {
  if (arrow.endBinding) {
    const shape = findBindableElement(arrow.endBinding.elementId, elements);
    if (shape) {
      return headingForPointFromElement(shape, getElementBounds(shape), endPt);
    }
  }
  // Default: heading from end toward start (entering end)
  return directionHeading(endPt, startPt);
}

/** Simple heading based on the dominant axis between two points. */
function directionHeading(from: GlobalPoint, to: GlobalPoint): Heading {
  if (Math.abs(to[0] - from[0]) < 0.001 && Math.abs(to[1] - from[1]) < 0.001) {
    return HEADING_RIGHT;
  }
  return vectorToHeading(vectorFromPoint(to, from));
}
