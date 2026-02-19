import { describe, it, expect } from "vitest";
import { youtubeProvider } from "./youtube";

describe("youtubeProvider.test()", () => {
  it.each([
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com/watch?v=dQw4w9WgXcQ",
    "http://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ",
    "https://www.youtube.com/embed/dQw4w9WgXcQ",
    "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    "https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf",
  ])("matches YouTube URL: %s", (url) => {
    expect(youtubeProvider.test(url)).toBe(true);
  });

  it.each(["https://vimeo.com/123456", "https://www.google.com", "not a url", ""])(
    "does not match non-YouTube URL: %s",
    (url) => {
      expect(youtubeProvider.test(url)).toBe(false);
    },
  );
});

describe("youtubeProvider.getEmbedData()", () => {
  it("returns embed data with correct URL for standard watch link", () => {
    const data = youtubeProvider.getEmbedData("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(data).not.toBeNull();
    expect(data?.url).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ?enablejsapi=1");
    expect(data?.providerName).toBe("YouTube");
    expect(data?.renderType).toBe("src");
    expect(data?.intrinsicSize).toEqual({ w: 560, h: 315 });
  });

  it("appends start time for seconds-only timestamp", () => {
    const data = youtubeProvider.getEmbedData("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120");
    expect(data?.url).toContain("&start=120");
  });

  it("parses h/m/s timestamp format", () => {
    const data = youtubeProvider.getEmbedData(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1h2m3s",
    );
    // 1*3600 + 2*60 + 3 = 3723
    expect(data?.url).toContain("&start=3723");
  });

  it("parses partial timestamp (minutes and seconds only)", () => {
    const data = youtubeProvider.getEmbedData(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=5m30s",
    );
    // 5*60 + 30 = 330
    expect(data?.url).toContain("&start=330");
  });

  it("returns portrait aspect ratio for shorts URLs", () => {
    const data = youtubeProvider.getEmbedData("https://www.youtube.com/shorts/dQw4w9WgXcQ");
    expect(data?.intrinsicSize).toEqual({ w: 315, h: 560 });
  });

  it("returns playlist embed URL for playlist links", () => {
    const data = youtubeProvider.getEmbedData(
      "https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf",
    );
    expect(data?.url).toContain("embed/videoseries?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf");
  });

  it("returns null for URLs without a valid video ID", () => {
    expect(youtubeProvider.getEmbedData("https://www.google.com")).toBeNull();
  });
});
