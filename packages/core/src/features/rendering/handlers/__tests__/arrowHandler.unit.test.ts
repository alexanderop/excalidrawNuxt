import { describe, it, expect } from "vitest";
import { arrowHandler } from "../arrowHandler";
import { createTestArrowElement } from "../../../../__test-utils__/factories/element";
import { pointFrom } from "../../../../shared/math";
import type { GlobalPoint, LocalPoint } from "../../../../shared/math";
import { isBindableHandler } from "../../../../shared/shapeHandlerRegistry";

describe("arrowHandler", () => {
  it('has type "arrow"', () => {
    expect(arrowHandler.type).toBe("arrow");
  });

  it("is not a bindable handler", () => {
    expect(isBindableHandler(arrowHandler)).toBe(false);
  });
});

describe("hitTest", () => {
  it("returns true for point on arrow segment", () => {
    const element = createTestArrowElement({
      x: 0,
      y: 0,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 0)] as readonly LocalPoint[],
    });
    const point = pointFrom<GlobalPoint>(50, 0);

    expect(arrowHandler.hitTest(point, element, 10)).toBe(true);
  });

  it("returns false for point far from arrow", () => {
    const element = createTestArrowElement({
      x: 0,
      y: 0,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 0)] as readonly LocalPoint[],
    });
    const point = pointFrom<GlobalPoint>(50, 100);

    expect(arrowHandler.hitTest(point, element, 10)).toBe(false);
  });

  it("returns true for point near multi-segment arrow", () => {
    const element = createTestArrowElement({
      x: 0,
      y: 0,
      points: [
        pointFrom<LocalPoint>(0, 0),
        pointFrom<LocalPoint>(50, 50),
        pointFrom<LocalPoint>(100, 0),
      ] as readonly LocalPoint[],
    });
    const point = pointFrom<GlobalPoint>(50, 50);

    expect(arrowHandler.hitTest(point, element, 10)).toBe(true);
  });

  it("accounts for element position offset", () => {
    const element = createTestArrowElement({
      x: 100,
      y: 100,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(50, 0)] as readonly LocalPoint[],
    });
    const point = pointFrom<GlobalPoint>(125, 100);

    expect(arrowHandler.hitTest(point, element, 10)).toBe(true);
  });
});

describe("getBounds", () => {
  it("returns bounds from arrow points", () => {
    const element = createTestArrowElement({
      x: 10,
      y: 20,
      points: [
        pointFrom<LocalPoint>(0, 0),
        pointFrom<LocalPoint>(100, 50),
      ] as readonly LocalPoint[],
    });
    const bounds = arrowHandler.getBounds(element);

    expect(bounds).toEqual([10, 20, 110, 70]);
  });

  it("returns bounds enclosing all multi-segment points", () => {
    const element = createTestArrowElement({
      x: 0,
      y: 0,
      points: [
        pointFrom<LocalPoint>(0, 0),
        pointFrom<LocalPoint>(50, -30),
        pointFrom<LocalPoint>(100, 20),
      ] as readonly LocalPoint[],
    });
    const bounds = arrowHandler.getBounds(element);

    expect(bounds).toEqual([0, -30, 100, 20]);
  });
});
