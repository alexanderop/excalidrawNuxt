// Constants
export { BASE_PADDING, DEDUP_THRESHOLD, ELBOW_CORNER_RADIUS } from "./constants";

// Types
export type { FixedSegment } from "./types";

// Heading (re-export from binding/heading for convenience)
export type { Heading } from "../binding/heading";
export {
  HEADING_RIGHT,
  HEADING_DOWN,
  HEADING_LEFT,
  HEADING_UP,
  vectorToHeading,
  flipHeading,
  compareHeading,
  headingIsHorizontal,
  headingIsVertical,
  headingForPoint,
  headingForPointIsHorizontal,
  headingForPointFromElement,
} from "../binding/heading";

// Grid
export type { Grid, Node, GridAddress } from "./grid";
export {
  calculateGrid,
  gridNodeFromAddr,
  getNeighbors,
  pointToGridNode,
  commonAABB,
  gridAddressesEqual,
} from "./grid";

// A* pathfinding
export { astar } from "./astar";

// Validation
export { validateElbowPoints, removeShortSegments, getCornerPoints } from "./validation";

// Shape generation
export { generateElbowArrowShape } from "./shape";

// Routing orchestrator
export { routeElbowArrow } from "./routeElbow";
