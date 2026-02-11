import { withSetup } from "~/__test-utils__/withSetup";
import { useImageCache } from "./useImageCache";
import type { FileId } from "./types";

describe("useImageCache", () => {
  // eslint-disable-next-line vitest/no-hooks -- global state must be reset
  beforeEach(() => {
    const { $reset } = useImageCache();
    $reset();
  });

  it("addImage stores an entry in the cache", () => {
    using cache = withSetup(() => useImageCache());
    const img = {} as HTMLImageElement;
    cache.addImage("file-1" as FileId, img, "image/png");
    expect(cache.cache.value.size).toBe(1);
  });

  it("getImage returns the image for a known id", () => {
    using cache = withSetup(() => useImageCache());
    const img = {} as HTMLImageElement;
    cache.addImage("file-1" as FileId, img, "image/png");
    expect(cache.getImage("file-1" as FileId)).toBe(img);
  });

  it("getImage returns undefined for unknown id", () => {
    using cache = withSetup(() => useImageCache());
    expect(cache.getImage("unknown" as FileId)).toBeUndefined();
  });

  it("getEntry returns the full entry with image and mimeType", () => {
    using cache = withSetup(() => useImageCache());
    const img = {} as HTMLImageElement;
    cache.addImage("file-1" as FileId, img, "image/png");

    const entry = cache.getEntry("file-1" as FileId);
    expect(entry).toEqual({ image: img, mimeType: "image/png" });
  });

  it("hasImage returns true for stored id and false for unknown", () => {
    using cache = withSetup(() => useImageCache());
    const img = {} as HTMLImageElement;
    cache.addImage("file-1" as FileId, img, "image/png");

    expect(cache.hasImage("file-1" as FileId)).toBe(true);
    expect(cache.hasImage("unknown" as FileId)).toBe(false);
  });

  it("removeImage removes the entry", () => {
    using cache = withSetup(() => useImageCache());
    const img = {} as HTMLImageElement;
    cache.addImage("file-1" as FileId, img, "image/png");
    cache.removeImage("file-1" as FileId);

    expect(cache.hasImage("file-1" as FileId)).toBe(false);
    expect(cache.cache.value.size).toBe(0);
  });

  it("$reset clears all entries", () => {
    using cache = withSetup(() => useImageCache());
    cache.addImage("file-1" as FileId, {} as HTMLImageElement, "image/png");
    cache.addImage("file-2" as FileId, {} as HTMLImageElement, "image/jpeg");

    expect(cache.cache.value.size).toBe(2);
    cache.$reset();
    expect(cache.cache.value.size).toBe(0);
  });
});
