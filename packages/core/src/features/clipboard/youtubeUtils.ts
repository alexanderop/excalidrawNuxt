import { tryCatchSync, tryCatch } from "../../utils/tryCatch";

/**
 * Patterns that match valid YouTube video URLs:
 * - youtube.com/watch?v=ID
 * - youtu.be/ID
 * - youtube.com/embed/ID
 * - youtube.com/shorts/ID
 * - youtube.com/v/ID
 * - youtube.com/live/ID
 * - m.youtube.com/watch?v=ID
 */
const YOUTUBE_HOSTS = new Set(["www.youtube.com", "youtube.com", "m.youtube.com", "youtu.be"]);

const PATH_VIDEO_ID_RE = /^\/(embed|shorts|v|live)\/([\w-]{11})/;
const VIDEO_ID_RE = /^[\w-]{11}$/;

function isValidVideoId(id: string | null | undefined): id is string {
  return typeof id === "string" && VIDEO_ID_RE.test(id);
}

/** Extract video ID from a parsed YouTube URL (assumes host is already validated). */
function videoIdFromParsedUrl(url: URL): string | null {
  // youtu.be/VIDEO_ID
  if (url.hostname === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0];
    return isValidVideoId(id) ? id : null;
  }

  // youtube.com/watch?v=VIDEO_ID
  if (url.pathname === "/watch") {
    const v = url.searchParams.get("v");
    return isValidVideoId(v) ? v : null;
  }

  // youtube.com/embed/ID, /shorts/ID, /v/ID, /live/ID
  const pathMatch = url.pathname.match(PATH_VIDEO_ID_RE);
  return pathMatch?.[2] ?? null;
}

/**
 * Returns true when the text is a YouTube video URL.
 */
export function isYouTubeUrl(text: string): boolean {
  return extractYouTubeVideoId(text) !== null;
}

/**
 * Extract the 11-character video ID from a YouTube URL.
 * Returns null if the URL is not a valid YouTube video link.
 */
export function extractYouTubeVideoId(text: string): string | null {
  const [error, url] = tryCatchSync(() => new URL(text));
  if (error) return null;

  const isHttp = url.protocol === "http:" || url.protocol === "https:";
  if (!isHttp || !YOUTUBE_HOSTS.has(url.hostname)) return null;

  return videoIdFromParsedUrl(url);
}

/**
 * Returns the URL for a YouTube video thumbnail.
 * Uses hqdefault (480x360) which is always available.
 */
export function getYouTubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

interface YouTubeOEmbedResult {
  title: string;
  thumbnailUrl: string;
}

/**
 * Fetch video metadata via YouTube's oEmbed endpoint (no API key required).
 * Returns the title and thumbnail URL, or null on failure.
 */
export async function fetchYouTubeOEmbed(videoUrl: string): Promise<YouTubeOEmbedResult | null> {
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;
  const [fetchError, res] = await tryCatch(fetch(oembedUrl));
  if (fetchError || !res.ok) return null;

  const [jsonError, data] = await tryCatch(res.json());
  if (jsonError) return null;

  const obj = data as Record<string, unknown>;
  if (typeof obj.title !== "string") return null;

  return {
    title: obj.title,
    thumbnailUrl:
      typeof obj.thumbnail_url === "string"
        ? obj.thumbnail_url
        : getYouTubeThumbnailUrl(extractYouTubeVideoId(videoUrl) ?? ""),
  };
}

/**
 * Load an image from a URL. Returns null on failure.
 */
export function loadImageFromUrl(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", () => resolve(null));
    img.src = src;
  });
}

// ── Preview image compositing ───────────────────────────────────────

const PREVIEW_WIDTH = 480;
const PREVIEW_HEIGHT = 360;
const PLAY_BUTTON_RADIUS = 30;
const TITLE_BAR_HEIGHT = 48;
const TITLE_FONT_SIZE = 14;
const TITLE_PADDING = 12;

/**
 * Create a composited YouTube preview image: thumbnail + play button + title bar.
 * Returns the composited HTMLImageElement, or null on failure.
 */
export async function createYouTubePreviewImage(
  videoId: string,
  title: string | null,
): Promise<{ image: HTMLImageElement; width: number; height: number } | null> {
  const thumbnailUrl = getYouTubeThumbnailUrl(videoId);
  const thumbnail = await loadImageFromUrl(thumbnailUrl);
  if (!thumbnail) return null;

  const w = thumbnail.naturalWidth || PREVIEW_WIDTH;
  const h = thumbnail.naturalHeight || PREVIEW_HEIGHT;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Draw thumbnail
  ctx.drawImage(thumbnail, 0, 0, w, h);

  // Draw semi-transparent play button circle
  const cx = w / 2;
  const cy = h / 2;
  const radius = PLAY_BUTTON_RADIUS * (w / PREVIEW_WIDTH);

  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  // Draw play triangle
  const triSize = radius * 0.7;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(cx - triSize * 0.4, cy - triSize);
  ctx.lineTo(cx - triSize * 0.4, cy + triSize);
  ctx.lineTo(cx + triSize * 0.8, cy);
  ctx.closePath();
  ctx.fill();

  // Draw title bar at bottom
  if (title) {
    const barH = TITLE_BAR_HEIGHT * (h / PREVIEW_HEIGHT);
    const fontSize = TITLE_FONT_SIZE * (w / PREVIEW_WIDTH);
    const padding = TITLE_PADDING * (w / PREVIEW_WIDTH);

    // Gradient overlay
    const gradient = ctx.createLinearGradient(0, h - barH * 1.5, 0, h);
    gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.75)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, h - barH * 1.5, w, barH * 1.5);

    // Title text
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textBaseline = "bottom";

    // Truncate title to fit
    const maxWidth = w - padding * 2;
    let displayTitle = title;
    let measured = ctx.measureText(displayTitle);
    while (measured.width > maxWidth && displayTitle.length > 3) {
      displayTitle = displayTitle.slice(0, -4) + "…";
      measured = ctx.measureText(displayTitle);
    }

    ctx.fillText(displayTitle, padding, h - padding);
  }

  // Convert canvas to image
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          resolve(null);
          return;
        }
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.addEventListener("load", () => {
          URL.revokeObjectURL(url);
          resolve({ image: img, width: w, height: h });
        });
        img.addEventListener("error", () => {
          URL.revokeObjectURL(url);
          resolve(null);
        });
        img.src = url;
      },
      "image/jpeg",
      0.92,
    );
  });
}
