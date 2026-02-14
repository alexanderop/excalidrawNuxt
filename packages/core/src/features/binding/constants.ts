import type { Theme } from "../theme/types";

/** Gap between arrow endpoint and shape edge (scene pixels) */
export const BASE_BINDING_GAP = 5;

/** Max distance from shape edge to trigger binding (screen pixels, divide by zoom) */
export const BASE_BINDING_DISTANCE = 15;

/** Minimum arrow diagonal to keep on creation (scene pixels) */
export const MINIMUM_ARROW_SIZE = 20;

/** Distance between bound shape centers below which arrows use 'inside' mode (scene pixels) */
export const SHORT_ARROW_THRESHOLD = 40;

/**
 * Compute a zoom-adjusted binding distance.
 * At low zoom levels the threshold is expanded so binding is still easy;
 * at zoom >= 1 the threshold stays constant.
 */
export function maxBindingDistance(zoom: number): number {
  const clampedZoom = Math.min(zoom, 1);
  return Math.min(BASE_BINDING_DISTANCE / (clampedZoom * 1.5), BASE_BINDING_DISTANCE * 2);
}

/** Highlight styling */
export const BINDING_HIGHLIGHT_LINE_WIDTH = 2;
export const BINDING_HIGHLIGHT_PADDING = 6;

export const BINDING_COLORS: Record<Theme, { highlight: string }> = {
  light: { highlight: "#4a90d9" },
  dark: { highlight: "rgba(3, 93, 161, 1)" },
};
