import type { ExcalidrawEmbeddableElement } from "../elements/types";
import { getEmbedData } from "./providerRegistry";

const CORNER_RADIUS = 8;

type ThemeColors = {
  bg: string;
  border: string;
  text: string;
};

const LIGHT_COLORS: ThemeColors = { bg: "#f0f0f0", border: "#d0d0d0", text: "#666666" };
const DARK_COLORS: ThemeColors = { bg: "#2a2a3a", border: "#4a4a5a", text: "#aaaaaa" };

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;

  let truncated = text;
  while (ctx.measureText(truncated + "\u2026").width > maxWidth && truncated.length > 10) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + "\u2026";
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  colors: ThemeColors,
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, CORNER_RADIUS);
  ctx.fillStyle = colors.bg;
  ctx.fill();
  ctx.strokeStyle = colors.border;
  ctx.lineWidth = 1;
  ctx.stroke();
}

/**
 * Renders a static canvas placeholder for an embeddable element.
 * Shows a rounded rect with the provider name and truncated URL.
 * Used for canvas rendering and export (iframes are DOM overlays).
 */
export function renderEmbeddablePlaceholder(
  ctx: CanvasRenderingContext2D,
  element: ExcalidrawEmbeddableElement,
  isDarkTheme: boolean,
): void {
  const { x, y, width, height, link } = element;
  if (width <= 0 || height <= 0) return;

  const colors = isDarkTheme ? DARK_COLORS : LIGHT_COLORS;

  ctx.save();

  drawRoundedRect(ctx, x, y, width, height, colors);

  const embedData = link ? getEmbedData(link) : null;
  const providerName = embedData?.providerName ?? "Embed";
  const fontSize = Math.min(16, Math.max(10, height / 8));
  const centerX = x + width / 2;
  const centerY = y + height / 2;

  ctx.fillStyle = colors.text;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.font = `bold ${fontSize * 1.2}px sans-serif`;
  ctx.fillText(providerName, centerX, centerY - fontSize);

  if (link) {
    ctx.font = `${fontSize * 0.8}px sans-serif`;
    ctx.fillText(truncateText(ctx, link, width - 20), centerX, centerY + fontSize * 0.8);
  }

  ctx.restore();
}
