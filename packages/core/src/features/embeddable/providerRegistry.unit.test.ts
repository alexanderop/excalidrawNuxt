import { describe, it, expect, beforeEach } from "vitest";
import { matchProvider, isEmbeddableUrl, getEmbedData, clearEmbedCache } from "./providerRegistry";

describe("providerRegistry", () => {
  beforeEach(() => {
    clearEmbedCache();
  });

  describe("matchProvider", () => {
    it("returns youtube provider for YouTube URLs", () => {
      const provider = matchProvider("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
      expect(provider?.id).toBe("youtube");
    });

    it("returns vimeo provider for Vimeo URLs", () => {
      const provider = matchProvider("https://vimeo.com/123456789");
      expect(provider?.id).toBe("vimeo");
    });

    it("returns undefined for unknown URLs", () => {
      expect(matchProvider("https://www.google.com")).toBeUndefined();
    });
  });

  describe("isEmbeddableUrl", () => {
    it("returns true for supported URLs", () => {
      expect(isEmbeddableUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
      expect(isEmbeddableUrl("https://vimeo.com/123456789")).toBe(true);
    });

    it("returns false for unsupported URLs", () => {
      expect(isEmbeddableUrl("https://www.google.com")).toBe(false);
      expect(isEmbeddableUrl("not a url")).toBe(false);
    });
  });

  describe("getEmbedData", () => {
    it("returns embed data for a YouTube URL", () => {
      const data = getEmbedData("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
      expect(data).not.toBeNull();
      expect(data?.providerName).toBe("YouTube");
    });

    it("returns embed data for a Vimeo URL", () => {
      const data = getEmbedData("https://vimeo.com/123456789");
      expect(data).not.toBeNull();
      expect(data?.providerName).toBe("Vimeo");
    });

    it("returns null for unknown URLs", () => {
      expect(getEmbedData("https://www.google.com")).toBeNull();
    });

    it("returns the same reference on cache hit", () => {
      const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
      const first = getEmbedData(url);
      const second = getEmbedData(url);
      expect(first).toBe(second);
    });

    it("caches null results", () => {
      const url = "https://unknown.example.com";
      const first = getEmbedData(url);
      const second = getEmbedData(url);
      expect(first).toBeNull();
      expect(second).toBeNull();
      expect(first).toBe(second);
    });
  });

  describe("clearEmbedCache", () => {
    it("allows re-resolution after clearing", () => {
      const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
      const first = getEmbedData(url);
      clearEmbedCache();
      const second = getEmbedData(url);

      expect(first).not.toBeNull();
      expect(second).not.toBeNull();
      expect(first).not.toBe(second);
      expect(first?.url).toBe(second?.url);
    });
  });
});
