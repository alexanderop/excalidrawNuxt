/**
 * Pure predicate functions that determine which properties apply to each element type.
 * No Vue imports — easily unit-testable.
 */

const HAS_STROKE_COLOR: ReadonlySet<string> = new Set([
  "rectangle",
  "ellipse",
  "diamond",
  "arrow",
  "line",
  "freedraw",
  "text",
]);

const HAS_BACKGROUND: ReadonlySet<string> = new Set([
  "rectangle",
  "ellipse",
  "diamond",
  "line",
  "freedraw",
]);

const HAS_STROKE_WIDTH: ReadonlySet<string> = new Set([
  "rectangle",
  "ellipse",
  "diamond",
  "arrow",
  "line",
  "freedraw",
]);

const HAS_FILL_STYLE: ReadonlySet<string> = HAS_BACKGROUND;

const HAS_STROKE_STYLE: ReadonlySet<string> = HAS_STROKE_WIDTH;

const HAS_ROUGHNESS: ReadonlySet<string> = HAS_STROKE_WIDTH;

const CAN_CHANGE_ROUNDNESS: ReadonlySet<string> = new Set([
  "rectangle",
  "diamond",
  "line",
  "image",
]);

export function hasStrokeColor(type: string): boolean {
  return HAS_STROKE_COLOR.has(type);
}

export function hasBackground(type: string): boolean {
  return HAS_BACKGROUND.has(type);
}

export function hasFillStyle(type: string): boolean {
  return HAS_FILL_STYLE.has(type);
}

export function hasStrokeWidth(type: string): boolean {
  return HAS_STROKE_WIDTH.has(type);
}

export function hasStrokeStyle(type: string): boolean {
  return HAS_STROKE_STYLE.has(type);
}

export function hasRoughness(type: string): boolean {
  return HAS_ROUGHNESS.has(type);
}

export function canChangeRoundness(type: string): boolean {
  return CAN_CHANGE_ROUNDNESS.has(type);
}
