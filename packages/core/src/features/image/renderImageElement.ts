import type { ExcalidrawImageElement, FileId, ImageCacheEntry } from "./types";
import { IMAGE_PLACEHOLDER_COLOR, IMAGE_PLACEHOLDER_ICON_SIZE } from "./constants";

function drawImagePlaceholder(
  ctx: CanvasRenderingContext2D,
  element: ExcalidrawImageElement,
): void {
  ctx.fillStyle = "#f8f9fa";
  ctx.fillRect(0, 0, element.width, element.height);

  ctx.strokeStyle = IMAGE_PLACEHOLDER_COLOR;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, element.width, element.height);

  // Draw a simple image icon in the center
  const iconSize = Math.min(IMAGE_PLACEHOLDER_ICON_SIZE, element.width * 0.5, element.height * 0.5);
  const cx = element.width / 2;
  const cy = element.height / 2;

  ctx.lineWidth = 2;

  // Mountain/landscape icon
  const halfIcon = iconSize / 2;
  ctx.beginPath();
  ctx.rect(cx - halfIcon, cy - halfIcon, iconSize, iconSize);
  ctx.stroke();

  // Mountain shape
  ctx.beginPath();
  ctx.moveTo(cx - halfIcon, cy + halfIcon * 0.6);
  ctx.lineTo(cx - halfIcon * 0.3, cy - halfIcon * 0.2);
  ctx.lineTo(cx + halfIcon * 0.1, cy + halfIcon * 0.3);
  ctx.lineTo(cx + halfIcon * 0.4, cy - halfIcon * 0.05);
  ctx.lineTo(cx + halfIcon, cy + halfIcon * 0.6);
  ctx.stroke();

  // Sun circle
  ctx.beginPath();
  ctx.arc(cx + halfIcon * 0.4, cy - halfIcon * 0.35, iconSize * 0.1, 0, Math.PI * 2);
  ctx.stroke();
}

export function renderImageElement(
  ctx: CanvasRenderingContext2D,
  element: ExcalidrawImageElement,
  imageCache: ReadonlyMap<FileId, ImageCacheEntry>,
): void {
  ctx.save();
  ctx.translate(element.x, element.y);

  if (element.angle) {
    ctx.translate(element.width / 2, element.height / 2);
    ctx.rotate(element.angle);
    ctx.translate(-element.width / 2, -element.height / 2);
  }

  ctx.globalAlpha = element.opacity / 100;

  // Apply scale (flip)
  const [sx, sy] = element.scale;
  if (sx !== 1 || sy !== 1) {
    ctx.translate(sx < 0 ? element.width : 0, sy < 0 ? element.height : 0);
    ctx.scale(sx, sy);
  }

  const cached = element.fileId ? imageCache.get(element.fileId) : null;
  if (cached?.image instanceof HTMLImageElement) {
    if (element.crop) {
      const { x: sx, y: sy, width: sw, height: sh } = element.crop;
      ctx.drawImage(cached.image, sx, sy, sw, sh, 0, 0, element.width, element.height);
      ctx.restore();
      return;
    }
    ctx.drawImage(cached.image, 0, 0, element.width, element.height);
    ctx.restore();
    return;
  }

  drawImagePlaceholder(ctx, element);

  ctx.restore();
}
