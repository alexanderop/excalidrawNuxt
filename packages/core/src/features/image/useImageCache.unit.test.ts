import { withDrawVue } from "../../__test-utils__/withDrawVue";
import { toFileId } from "./types";
import type { ImageCacheEntry } from "./types";

const DUMMY_DATA_URL = "data:image/png;base64,dGVzdA==";

function entry(overrides?: Partial<ImageCacheEntry>): ImageCacheEntry {
  return {
    image: {} as HTMLImageElement,
    mimeType: "image/png",
    dataURL: DUMMY_DATA_URL,
    created: Date.now(),
    ...overrides,
  };
}

describe("useImageCache", () => {
  it("addImage stores an entry in the cache", () => {
    using ctx = withDrawVue(() => ({}));
    ctx.drawVue.imageCache.addImage(toFileId("file-1"), entry());
    expect(ctx.drawVue.imageCache.cache.value.size).toBe(1);
  });

  it("getImage returns the image for a known id", () => {
    using ctx = withDrawVue(() => ({}));
    const img = {} as HTMLImageElement;
    ctx.drawVue.imageCache.addImage(toFileId("file-1"), entry({ image: img }));
    expect(ctx.drawVue.imageCache.getImage(toFileId("file-1"))).toBe(img);
  });

  it("getImage returns undefined for unknown id", () => {
    using ctx = withDrawVue(() => ({}));
    expect(ctx.drawVue.imageCache.getImage(toFileId("unknown"))).toBeUndefined();
  });

  it("getEntry returns the full entry with image, mimeType, dataURL, and created", () => {
    using ctx = withDrawVue(() => ({}));
    const img = {} as HTMLImageElement;
    const created = Date.now();
    ctx.drawVue.imageCache.addImage(toFileId("file-1"), entry({ image: img, created }));

    const result = ctx.drawVue.imageCache.getEntry(toFileId("file-1"));
    expect(result).toEqual({ image: img, mimeType: "image/png", dataURL: DUMMY_DATA_URL, created });
  });

  it("hasImage returns true for stored id and false for unknown", () => {
    using ctx = withDrawVue(() => ({}));
    ctx.drawVue.imageCache.addImage(toFileId("file-1"), entry());

    expect(ctx.drawVue.imageCache.hasImage(toFileId("file-1"))).toBe(true);
    expect(ctx.drawVue.imageCache.hasImage(toFileId("unknown"))).toBe(false);
  });

  it("removeImage removes the entry", () => {
    using ctx = withDrawVue(() => ({}));
    ctx.drawVue.imageCache.addImage(toFileId("file-1"), entry());
    ctx.drawVue.imageCache.removeImage(toFileId("file-1"));

    expect(ctx.drawVue.imageCache.hasImage(toFileId("file-1"))).toBe(false);
    expect(ctx.drawVue.imageCache.cache.value.size).toBe(0);
  });

  it("$reset clears all entries", () => {
    using ctx = withDrawVue(() => ({}));
    ctx.drawVue.imageCache.addImage(toFileId("file-1"), entry());
    ctx.drawVue.imageCache.addImage(toFileId("file-2"), entry({ mimeType: "image/jpeg" }));

    expect(ctx.drawVue.imageCache.cache.value.size).toBe(2);
    ctx.drawVue.imageCache.$reset();
    expect(ctx.drawVue.imageCache.cache.value.size).toBe(0);
  });

  describe("registerImage", () => {
    it("is available on the imageCache return", () => {
      using ctx = withDrawVue(() => ({}));
      expect(typeof ctx.drawVue.imageCache.registerImage).toBe("function");
    });
  });
});
