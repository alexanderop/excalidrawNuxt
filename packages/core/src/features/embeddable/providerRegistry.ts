import type { EmbedData, EmbedProvider } from "./types";
import { youtubeProvider } from "./providers/youtube";
import { vimeoProvider } from "./providers/vimeo";

/** All registered embed providers, checked in order. */
const providers: readonly EmbedProvider[] = [youtubeProvider, vimeoProvider];

/** Cache of previously resolved embed data to avoid re-matching. */
const embedCache = new Map<string, EmbedData | null>();

/** Returns the first provider that matches the URL, or undefined. */
export function matchProvider(url: string): EmbedProvider | undefined {
  return providers.find((p) => p.test(url));
}

/** Returns embed data for a URL, or null if no provider matches. Cached. */
export function getEmbedData(url: string): EmbedData | null {
  const cached = embedCache.get(url);
  if (cached !== undefined) return cached;

  const provider = matchProvider(url);
  const data = provider?.getEmbedData(url) ?? null;
  embedCache.set(url, data);
  return data;
}

/** Returns true if any registered provider handles this URL. */
export function isEmbeddableUrl(url: string): boolean {
  return providers.some((p) => p.test(url));
}

/** Clears the embed cache. Useful for test isolation. */
export function clearEmbedCache(): void {
  embedCache.clear();
}
