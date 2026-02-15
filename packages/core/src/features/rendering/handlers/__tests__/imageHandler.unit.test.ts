import { describe, it, expect } from "vitest";
import { imageHandler } from "../imageHandler";
import { createTestImageElement } from "../../../../__test-utils__/factories/element";
import { pointFrom } from "../../../../shared/math";
import type { GlobalPoint } from "../../../../shared/math";
import { isBindableHandler } from "../../../../shared/shapeHandlerRegistry";

describe("imageHandler", () => {
  it('has type "image"', () => {
    expect(imageHandler.type).toBe("image");
  });

  it("is not a bindable handler", () => {
    expect(isBindableHandler(imageHandler)).toBe(false);
  });
});

describe("hitTest", () => {
  it("returns true for point inside image bounds", () => {
    const element = createTestImageElement({ x: 0, y: 0, width: 100, height: 100 });
    const point = pointFrom<GlobalPoint>(50, 50);

    expect(imageHandler.hitTest(point, element, 10)).toBe(true);
  });

  it("returns false for point outside image bounds", () => {
    const element = createTestImageElement({ x: 0, y: 0, width: 100, height: 100 });
    const point = pointFrom<GlobalPoint>(200, 200);

    expect(imageHandler.hitTest(point, element, 10)).toBe(false);
  });

  it("returns true for point within threshold of image edge", () => {
    const element = createTestImageElement({ x: 0, y: 0, width: 100, height: 100 });
    const point = pointFrom<GlobalPoint>(-5, 50);

    expect(imageHandler.hitTest(point, element, 10)).toBe(true);
  });

  it("accounts for element position offset", () => {
    const element = createTestImageElement({ x: 50, y: 50, width: 100, height: 100 });
    const point = pointFrom<GlobalPoint>(100, 100);

    expect(imageHandler.hitTest(point, element, 10)).toBe(true);
  });
});

describe("getBounds", () => {
  it("returns element bounds", () => {
    const element = createTestImageElement({ x: 10, y: 20, width: 100, height: 50 });
    const bounds = imageHandler.getBounds(element);

    expect(bounds).toEqual([10, 20, 110, 70]);
  });
});
