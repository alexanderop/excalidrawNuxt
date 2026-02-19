import type { EmbedProvider, EmbedData } from "../types";

const RE_YOUTUBE =
  /^(?:https?:\/\/)?(?:www\.)?youtu(?:be\.com|\.be)\/(embed\/|watch\?v=|shorts\/|playlist\?list=|embed\/videoseries\?list=)?([\w-]+)/;

function parseTimestamp(url: string): number {
  const urlObj = new URL(url.startsWith("http") ? url : `https://${url}`);
  const timeParam = urlObj.searchParams.get("t") ?? urlObj.searchParams.get("start");

  if (!timeParam) return 0;

  if (/^\d+$/.test(timeParam)) {
    return Number.parseInt(timeParam, 10);
  }

  const match = timeParam.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!match) return 0;

  const [, hours = "0", minutes = "0", seconds = "0"] = match;
  return (
    Number.parseInt(hours, 10) * 3600 +
    Number.parseInt(minutes, 10) * 60 +
    Number.parseInt(seconds, 10)
  );
}

function toEmbedUrl(url: string, match: RegExpMatchArray): string {
  const videoId = match[2];
  const startTime = parseTimestamp(url);
  const time = startTime > 0 ? `&start=${startTime}` : "";

  if (match[1] === "playlist?list=" || match[1] === "embed/videoseries?list=") {
    return `https://www.youtube.com/embed/videoseries?list=${videoId}&enablejsapi=1${time}`;
  }

  return `https://www.youtube.com/embed/${videoId}?enablejsapi=1${time}`;
}

export const youtubeProvider: EmbedProvider = {
  id: "youtube",
  name: "YouTube",

  test(url: string): boolean {
    return RE_YOUTUBE.test(url);
  },

  getEmbedData(url: string): EmbedData | null {
    const match = url.match(RE_YOUTUBE);
    if (!match?.[2]) return null;

    const isPortrait = url.includes("shorts");
    const intrinsicSize = isPortrait ? { w: 315, h: 560 } : { w: 560, h: 315 };

    return {
      url: toEmbedUrl(url, match),
      intrinsicSize,
      renderType: "src",
      sandbox: { allowSameOrigin: true },
      providerName: "YouTube",
    };
  },
};
