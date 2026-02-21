import { describe, it, expect, vi } from "vitest";
import { isYouTubeUrl, extractYouTubeVideoId, fetchYouTubeOEmbed } from "./youtubeUtils";

describe("isYouTubeUrl", () => {
  it.each([
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com/watch?v=dQw4w9WgXcQ",
    "http://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ",
    "https://www.youtube.com/embed/dQw4w9WgXcQ",
    "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com/live/dQw4w9WgXcQ",
  ])("returns true for valid YouTube URL: %s", (url) => {
    expect(isYouTubeUrl(url)).toBe(true);
  });

  it.each([
    "https://www.google.com",
    "https://vimeo.com/12345",
    "not a url",
    "https://www.youtube.com/",
    "https://www.youtube.com/feed/subscriptions",
    "https://www.youtube.com/watch",
  ])("returns false for non-video URL: %s", (url) => {
    expect(isYouTubeUrl(url)).toBe(false);
  });
});

describe("extractYouTubeVideoId", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s", "dQw4w9WgXcQ"],
  ])("extracts ID from %s", (url, expectedId) => {
    expect(extractYouTubeVideoId(url)).toBe(expectedId);
  });

  it.each(["not a url", "ftp://youtube.com/watch?v=dQw4w9WgXcQ", "https://www.youtube.com/"])(
    "returns null for invalid input: %s",
    (url) => {
      expect(extractYouTubeVideoId(url)).toBeNull();
    },
  );
});

describe("fetchYouTubeOEmbed", () => {
  it("returns title and thumbnail on success", async () => {
    vi.restoreAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            title: "Test Video",
            thumbnail_url: "https://img.youtube.com/vi/abc/hqdefault.jpg",
          }),
      }),
    );

    const result = await fetchYouTubeOEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(result).toEqual({
      title: "Test Video",
      thumbnailUrl: "https://img.youtube.com/vi/abc/hqdefault.jpg",
    });
  });

  it("returns null when fetch throws", async () => {
    vi.restoreAllMocks();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

    const result = await fetchYouTubeOEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(result).toBeNull();
  });

  it("returns null when response is not ok", async () => {
    vi.restoreAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({}),
      }),
    );

    const result = await fetchYouTubeOEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(result).toBeNull();
  });

  it("falls back to hqdefault thumbnail when thumbnail_url is missing", async () => {
    vi.restoreAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            title: "No Thumb",
          }),
      }),
    );

    const result = await fetchYouTubeOEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(result).toEqual({
      title: "No Thumb",
      thumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    });
  });
});
