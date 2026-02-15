import type { ExcalidrawArrowElement, Arrowhead, StrokeStyle } from "../elements/types";
import type { LocalPoint } from "../../shared/math";
import type { Theme } from "../theme/types";
import { resolveColor } from "../theme/colors";

const DEG_TO_RAD = Math.PI / 180;

/**
 * Returns the base size (in px) for a given arrowhead type.
 * Values from the Excalidraw spec (docs/arrow-tech-spec.md Section 6).
 */
export function getArrowheadSize(type: Arrowhead): number {
  switch (type) {
    case "arrow": {
      return 25;
    }
    case "diamond":
    case "diamond_outline": {
      return 12;
    }
    case "crowfoot_one":
    case "crowfoot_many":
    case "crowfoot_one_or_many": {
      return 20;
    }
    // bar, dot, circle, circle_outline, triangle, triangle_outline
    default: {
      return 15;
    }
  }
}

/**
 * Returns the half-angle (in radians) for arrowhead types that use angled wings.
 * Returns 0 for types that don't use an angle (circles, crowfoot).
 */
export function getArrowheadAngle(type: Arrowhead): number {
  switch (type) {
    case "arrow": {
      return 20 * DEG_TO_RAD;
    }
    case "bar":
    case "crowfoot_one": {
      return 90 * DEG_TO_RAD;
    }
    case "triangle":
    case "triangle_outline":
    case "diamond":
    case "diamond_outline": {
      return 25 * DEG_TO_RAD;
    }
    // circle, circle_outline, dot, crowfoot_many, crowfoot_one_or_many
    default: {
      return 0;
    }
  }
}

/** Background fill for outline variants (canvas bg color). */
const OUTLINE_FILL = "#ffffff";

/** Arrowhead types that are filled shapes — these should NOT get dashed strokes. */
const FILLED_ARROWHEADS: ReadonlySet<Arrowhead> = new Set(["dot", "circle", "triangle", "diamond"]);

/** Returns the dash array for a given stroke style, matching the arrow body pattern. */
export function getStrokeLineDash(strokeStyle: StrokeStyle, strokeWidth: number): number[] {
  if (strokeStyle === "dashed") return [8, 8 + strokeWidth];
  if (strokeStyle === "dotted") return [1.5, 6 + strokeWidth];
  return [];
}

export function renderArrowheads(
  ctx: CanvasRenderingContext2D,
  element: ExcalidrawArrowElement,
  theme: Theme,
): void {
  const { points, endArrowhead, startArrowhead, strokeWidth, strokeColor, strokeStyle } = element;
  if (points.length < 2) return;

  const color = resolveColor(strokeColor, theme);

  if (endArrowhead !== null) {
    const tip = points.at(-1);
    const prev = points.at(-2);
    if (!tip || !prev) return;
    drawArrowhead(ctx, prev, tip, endArrowhead, strokeWidth, color, strokeStyle);
  }

  if (startArrowhead !== null) {
    const tip = points[0];
    const next = points[1];
    if (!tip || !next) return;
    drawArrowhead(ctx, next, tip, startArrowhead, strokeWidth, color, strokeStyle);
  }
}

interface ArrowheadDrawParams {
  ctx: CanvasRenderingContext2D;
  tip: LocalPoint;
  angle: number;
  size: number;
  headAngle: number;
  color: string;
  strokeStyle: StrokeStyle;
}

const arrowheadDrawers: Record<Arrowhead, (p: ArrowheadDrawParams) => void> = {
  arrow: (p) => drawArrowLines(p.ctx, p.tip, p.angle, p.size, p.headAngle),
  bar: (p) => drawBar(p.ctx, p.tip, p.angle, p.size),
  dot: (p) => drawCircle(p.ctx, p.tip, p.angle, p.size, p.color, p.color),
  circle: (p) => drawCircle(p.ctx, p.tip, p.angle, p.size, p.color, p.color),
  circle_outline: (p) => drawCircle(p.ctx, p.tip, p.angle, p.size, OUTLINE_FILL, p.color),
  triangle: (p) => drawTriangle(p.ctx, p.tip, p.angle, p.size, p.headAngle, p.color, p.color),
  triangle_outline: (p) =>
    drawTriangle(p.ctx, p.tip, p.angle, p.size, p.headAngle, OUTLINE_FILL, p.color),
  diamond: (p) => drawDiamond(p.ctx, p.tip, p.angle, p.size, p.headAngle, p.color, p.color),
  diamond_outline: (p) =>
    drawDiamond(p.ctx, p.tip, p.angle, p.size, p.headAngle, OUTLINE_FILL, p.color),
  crowfoot_one: (p) => drawCrowfootOne(p.ctx, p.tip, p.angle, p.size),
  crowfoot_many: (p) => drawCrowfootMany(p.ctx, p.tip, p.angle, p.size),
  crowfoot_one_or_many: (p) => {
    drawCrowfootMany(p.ctx, p.tip, p.angle, p.size);
    drawCrowfootOne(p.ctx, p.tip, p.angle, p.size);
  },
};

function drawArrowhead(
  ctx: CanvasRenderingContext2D,
  from: LocalPoint,
  tip: LocalPoint,
  style: Arrowhead,
  strokeWidth: number,
  color: string,
  strokeStyle: StrokeStyle,
): void {
  const angle = Math.atan2(tip[1] - from[1], tip[0] - from[0]);
  const segmentLength = Math.hypot(tip[0] - from[0], tip[1] - from[1]);

  const isDiamond = style === "diamond" || style === "diamond_outline";
  const lengthMultiplier = isDiamond ? 0.25 : 0.5;
  const baseSize = getArrowheadSize(style);
  const headSize = Math.min(baseSize, segmentLength * lengthMultiplier);
  const headAngle = getArrowheadAngle(style);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (!FILLED_ARROWHEADS.has(style)) {
    ctx.setLineDash(getStrokeLineDash(strokeStyle, strokeWidth));
  }

  arrowheadDrawers[style]({ ctx, tip, angle, size: headSize, headAngle, color, strokeStyle });

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Individual arrowhead drawing helpers
// ---------------------------------------------------------------------------

function drawArrowLines(
  ctx: CanvasRenderingContext2D,
  tip: LocalPoint,
  angle: number,
  size: number,
  headAngle: number,
): void {
  const wingLeftX = tip[0] - size * Math.cos(angle - headAngle);
  const wingLeftY = tip[1] - size * Math.sin(angle - headAngle);
  const wingRightX = tip[0] - size * Math.cos(angle + headAngle);
  const wingRightY = tip[1] - size * Math.sin(angle + headAngle);

  ctx.beginPath();
  ctx.moveTo(wingLeftX, wingLeftY);
  ctx.lineTo(tip[0], tip[1]);
  ctx.lineTo(wingRightX, wingRightY);
  ctx.stroke();
}

function drawBar(
  ctx: CanvasRenderingContext2D,
  tip: LocalPoint,
  angle: number,
  size: number,
): void {
  // Perpendicular line across the tip
  const perpAngle = angle + Math.PI / 2;
  const halfSize = size / 2;
  const x1 = tip[0] + halfSize * Math.cos(perpAngle);
  const y1 = tip[1] + halfSize * Math.sin(perpAngle);
  const x2 = tip[0] - halfSize * Math.cos(perpAngle);
  const y2 = tip[1] - halfSize * Math.sin(perpAngle);

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function drawCircle(
  ctx: CanvasRenderingContext2D,
  tip: LocalPoint,
  angle: number,
  size: number,
  fillColor: string,
  strokeColor: string,
): void {
  const radius = size / 2;
  // Center is offset back from the tip by the radius along the arrow direction
  const cx = tip[0] - radius * Math.cos(angle);
  const cy = tip[1] - radius * Math.sin(angle);

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.strokeStyle = strokeColor;
  ctx.stroke();
}

function drawTriangle(
  ctx: CanvasRenderingContext2D,
  tip: LocalPoint,
  angle: number,
  size: number,
  headAngle: number,
  fillColor: string,
  strokeColor: string,
): void {
  const wingLeftX = tip[0] - size * Math.cos(angle - headAngle);
  const wingLeftY = tip[1] - size * Math.sin(angle - headAngle);
  const wingRightX = tip[0] - size * Math.cos(angle + headAngle);
  const wingRightY = tip[1] - size * Math.sin(angle + headAngle);

  ctx.fillStyle = fillColor;
  ctx.strokeStyle = strokeColor;
  ctx.beginPath();
  ctx.moveTo(tip[0], tip[1]);
  ctx.lineTo(wingLeftX, wingLeftY);
  ctx.lineTo(wingRightX, wingRightY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawDiamond(
  ctx: CanvasRenderingContext2D,
  tip: LocalPoint,
  angle: number,
  size: number,
  headAngle: number,
  fillColor: string,
  strokeColor: string,
): void {
  // Diamond has 4 points: tip, left wing, back point, right wing
  const wingLeftX = tip[0] - size * Math.cos(angle - headAngle);
  const wingLeftY = tip[1] - size * Math.sin(angle - headAngle);
  const wingRightX = tip[0] - size * Math.cos(angle + headAngle);
  const wingRightY = tip[1] - size * Math.sin(angle + headAngle);
  // Back point is opposite the tip, at 2x the base distance along the arrow direction
  const backX = tip[0] - 2 * size * Math.cos(angle);
  const backY = tip[1] - 2 * size * Math.sin(angle);

  ctx.fillStyle = fillColor;
  ctx.strokeStyle = strokeColor;
  ctx.beginPath();
  ctx.moveTo(tip[0], tip[1]);
  ctx.lineTo(wingLeftX, wingLeftY);
  ctx.lineTo(backX, backY);
  ctx.lineTo(wingRightX, wingRightY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawCrowfootOne(
  ctx: CanvasRenderingContext2D,
  tip: LocalPoint,
  angle: number,
  size: number,
): void {
  // Single perpendicular line at the tip (like bar but at a slight offset back)
  const perpAngle = angle + Math.PI / 2;
  const halfSize = size / 2;
  // Offset back from tip by a fraction of the size for combined rendering
  const offsetX = tip[0] - size * 0.3 * Math.cos(angle);
  const offsetY = tip[1] - size * 0.3 * Math.sin(angle);
  const x1 = offsetX + halfSize * Math.cos(perpAngle);
  const y1 = offsetY + halfSize * Math.sin(perpAngle);
  const x2 = offsetX - halfSize * Math.cos(perpAngle);
  const y2 = offsetY - halfSize * Math.sin(perpAngle);

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function drawCrowfootMany(
  ctx: CanvasRenderingContext2D,
  tip: LocalPoint,
  angle: number,
  size: number,
): void {
  // Three angled lines from a point behind the tip to the tip area (crow's foot)
  const spreadAngle = 30 * DEG_TO_RAD;
  const baseX = tip[0] - size * Math.cos(angle);
  const baseY = tip[1] - size * Math.sin(angle);

  // Center line: base -> tip
  ctx.beginPath();
  ctx.moveTo(baseX, baseY);
  ctx.lineTo(tip[0], tip[1]);
  ctx.stroke();

  // Left splay
  const leftX = tip[0] + size * 0.4 * Math.cos(angle + Math.PI - spreadAngle);
  const leftY = tip[1] + size * 0.4 * Math.sin(angle + Math.PI - spreadAngle);
  ctx.beginPath();
  ctx.moveTo(tip[0], tip[1]);
  ctx.lineTo(leftX, leftY);
  ctx.stroke();

  // Right splay
  const rightX = tip[0] + size * 0.4 * Math.cos(angle + Math.PI + spreadAngle);
  const rightY = tip[1] + size * 0.4 * Math.sin(angle + Math.PI + spreadAngle);
  ctx.beginPath();
  ctx.moveTo(tip[0], tip[1]);
  ctx.lineTo(rightX, rightY);
  ctx.stroke();
}
