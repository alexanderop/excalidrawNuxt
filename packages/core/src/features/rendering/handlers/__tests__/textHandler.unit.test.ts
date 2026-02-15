import { describe, it, expect } from "vitest";
import { textHandler } from "../textHandler";
import { createTestTextElement } from "../../../../__test-utils__/factories/element";
import { pointFrom } from "../../../../shared/math";
import type { GlobalPoint } from "../../../../shared/math";
import { isBindableHandler } from "../../../../shared/shapeHandlerRegistry";

describe("textHandler", () => {
  it('has type "text"', () => {
    expect(textHandler.type).toBe("text");
  });

  it("is not a bindable handler", () => {
    expect(isBindableHandler(textHandler)).toBe(false);
  });
});

describe("hitTest", () => {
  it("returns true for point inside text bounds", () => {
    const element = createTestTextElement({ x: 0, y: 0, width: 100, height: 50 });
    const point = pointFrom<GlobalPoint>(50, 25);

    expect(textHandler.hitTest(point, element, 10)).toBe(true);
  });

  it("returns false for point outside text bounds", () => {
    const element = createTestTextElement({ x: 0, y: 0, width: 100, height: 50 });
    const point = pointFrom<GlobalPoint>(200, 200);

    expect(textHandler.hitTest(point, element, 10)).toBe(false);
  });

  it("returns true for point within threshold of text edge", () => {
    const element = createTestTextElement({ x: 0, y: 0, width: 100, height: 50 });
    const point = pointFrom<GlobalPoint>(-5, 25);

    expect(textHandler.hitTest(point, element, 10)).toBe(true);
  });

  it("accounts for element position offset", () => {
    const element = createTestTextElement({ x: 50, y: 50, width: 100, height: 50 });
    const point = pointFrom<GlobalPoint>(100, 75);

    expect(textHandler.hitTest(point, element, 10)).toBe(true);
  });
});

describe("getBounds", () => {
  it("returns element bounds", () => {
    const element = createTestTextElement({ x: 10, y: 20, width: 100, height: 50 });
    const bounds = textHandler.getBounds(element);

    expect(bounds).toEqual([10, 20, 110, 70]);
  });
});
