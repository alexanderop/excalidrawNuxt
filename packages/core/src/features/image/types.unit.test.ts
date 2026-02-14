import { isImageElement, isInitializedImageElement } from "./types";
import { createTestImageElement, createTestElement } from "../../__test-utils__/factories/element";

describe("isImageElement", () => {
  it("returns true for image element", () => {
    const el = createTestImageElement();
    expect(isImageElement(el)).toBe(true);
  });

  it("returns false for rectangle element", () => {
    const el = createTestElement();
    expect(isImageElement(el)).toBe(false);
  });

  it("returns false for null", () => {
    expect(isImageElement(null)).toBe(false);
  });
});

describe("isInitializedImageElement", () => {
  it("returns true for image with fileId", () => {
    const el = createTestImageElement({ fileId: "some-file-id" as unknown as never });
    expect(isInitializedImageElement(el)).toBe(true);
  });

  it("returns false for image with null fileId", () => {
    const el = createTestImageElement({ fileId: null as unknown as never });
    expect(isInitializedImageElement(el)).toBe(false);
  });

  it("returns false for non-image element", () => {
    const el = createTestElement();
    expect(isInitializedImageElement(el)).toBe(false);
  });
});
