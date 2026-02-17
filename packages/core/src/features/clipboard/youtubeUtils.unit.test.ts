import { describe, it, expect } from "vitest";
import { isYouTubeUrl, extractYouTubeVideoId, getYouTubeThumbnailUrl } from "./youtubeUtils";

describe("isYouTubeUrl", () => {
  it("returns true for standard youtube.com/watch URLs", () => {
    expect(isYouTubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
    expect(isYouTubeUrl("https://youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
    expect(isYouTubeUrl("http://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
  });

  it("returns true for youtu.be short URLs", () => {
    expect(isYouTubeUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(true);
  });

  it("returns true for embed URLs", () => {
    expect(isYouTubeUrl("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe(true);
  });

  it("returns true for shorts URLs", () => {
    expect(isYouTubeUrl("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe(true);
  });

  it("returns true for mobile URLs", () => {
    expect(isYouTubeUrl("https://m.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
  });

  it("returns true for live URLs", () => {
    expect(isYouTubeUrl("https://www.youtube.com/live/dQw4w9WgXcQ")).toBe(true);
  });

  it("returns false for non-YouTube URLs", () => {
    expect(isYouTubeUrl("https://www.google.com")).toBe(false);
    expect(isYouTubeUrl("https://vimeo.com/12345")).toBe(false);
    expect(isYouTubeUrl("not a url")).toBe(false);
  });

  it("returns false for YouTube URLs without a valid video ID", () => {
    expect(isYouTubeUrl("https://www.youtube.com/")).toBe(false);
    expect(isYouTubeUrl("https://www.youtube.com/feed/subscriptions")).toBe(false);
    expect(isYouTubeUrl("https://www.youtube.com/watch")).toBe(false);
  });
});

describe("extractYouTubeVideoId", () => {
  it("extracts ID from watch URLs", () => {
    expect(extractYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    );
  });

  it("extracts ID from youtu.be short URLs", () => {
    expect(extractYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts ID from embed URLs", () => {
    expect(extractYouTubeVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts ID from shorts URLs", () => {
    expect(extractYouTubeVideoId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("preserves extra query params", () => {
    expect(extractYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s")).toBe(
      "dQw4w9WgXcQ",
    );
  });

  it("returns null for invalid input", () => {
    expect(extractYouTubeVideoId("not a url")).toBeNull();
    expect(extractYouTubeVideoId("ftp://youtube.com/watch?v=dQw4w9WgXcQ")).toBeNull();
  });
});

describe("getYouTubeThumbnailUrl", () => {
  it("returns the hqdefault thumbnail URL", () => {
    expect(getYouTubeThumbnailUrl("dQw4w9WgXcQ")).toBe(
      "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    );
  });
});
