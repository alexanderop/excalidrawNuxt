import { tryCatchSync } from "../../utils/tryCatch";

export { isYouTubeUrl, extractYouTubeVideoId } from "./youtubeUtils";

const IMAGE_EXTENSION_RE = /\.(png|jpe?g|gif|webp|svg|bmp|ico|tiff?)(\?.*)?$/i;

/**
 * Returns true when `text` looks like an absolute HTTP(S) URL.
 */
export function isUrl(text: string): boolean {
  const [error, url] = tryCatchSync(() => new URL(text));
  if (error) return false;
  return url.protocol === "http:" || url.protocol === "https:";
}

/**
 * Returns true when `url` points to a common image file extension.
 */
export function isImageUrl(url: string): boolean {
  if (!isUrl(url)) return false;
  const [error, parsed] = tryCatchSync(() => new URL(url));
  if (error) return false;
  return IMAGE_EXTENSION_RE.test(parsed.pathname);
}
