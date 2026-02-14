import { withDrawVue } from "../../__test-utils__/withDrawVue";
import type { FileId } from "./types";

describe("useImageCache", () => {
  it("addImage stores an entry in the cache", () => {
    using ctx = withDrawVue(() => ({}));
    const img = {} as HTMLImageElement;
    ctx.drawVue.imageCache.addImage("file-1" as FileId, img, "image/png");
    expect(ctx.drawVue.imageCache.cache.value.size).toBe(1);
  });

  it("getImage returns the image for a known id", () => {
    using ctx = withDrawVue(() => ({}));
    const img = {} as HTMLImageElement;
    ctx.drawVue.imageCache.addImage("file-1" as FileId, img, "image/png");
    expect(ctx.drawVue.imageCache.getImage("file-1" as FileId)).toBe(img);
  });

  it("getImage returns undefined for unknown id", () => {
    using ctx = withDrawVue(() => ({}));
    expect(ctx.drawVue.imageCache.getImage("unknown" as FileId)).toBeUndefined();
  });

  it("getEntry returns the full entry with image and mimeType", () => {
    using ctx = withDrawVue(() => ({}));
    const img = {} as HTMLImageElement;
    ctx.drawVue.imageCache.addImage("file-1" as FileId, img, "image/png");

    const entry = ctx.drawVue.imageCache.getEntry("file-1" as FileId);
    expect(entry).toEqual({ image: img, mimeType: "image/png" });
  });

  it("hasImage returns true for stored id and false for unknown", () => {
    using ctx = withDrawVue(() => ({}));
    const img = {} as HTMLImageElement;
    ctx.drawVue.imageCache.addImage("file-1" as FileId, img, "image/png");

    expect(ctx.drawVue.imageCache.hasImage("file-1" as FileId)).toBe(true);
    expect(ctx.drawVue.imageCache.hasImage("unknown" as FileId)).toBe(false);
  });

  it("removeImage removes the entry", () => {
    using ctx = withDrawVue(() => ({}));
    const img = {} as HTMLImageElement;
    ctx.drawVue.imageCache.addImage("file-1" as FileId, img, "image/png");
    ctx.drawVue.imageCache.removeImage("file-1" as FileId);

    expect(ctx.drawVue.imageCache.hasImage("file-1" as FileId)).toBe(false);
    expect(ctx.drawVue.imageCache.cache.value.size).toBe(0);
  });

  it("$reset clears all entries", () => {
    using ctx = withDrawVue(() => ({}));
    ctx.drawVue.imageCache.addImage("file-1" as FileId, {} as HTMLImageElement, "image/png");
    ctx.drawVue.imageCache.addImage("file-2" as FileId, {} as HTMLImageElement, "image/jpeg");

    expect(ctx.drawVue.imageCache.cache.value.size).toBe(2);
    ctx.drawVue.imageCache.$reset();
    expect(ctx.drawVue.imageCache.cache.value.size).toBe(0);
  });
});
