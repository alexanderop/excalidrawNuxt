import { describe, it, expect } from "vitest";
import { createTestElement } from "../../__test-utils__/factories/element";
import type { Radians } from "../../shared/math";
import { getElementBounds, getCommonBounds } from "./bounds";

describe("getElementBounds", () => {
  it("returns [x, y, x+w, y+h] for axis-aligned element", () => {
    const el = createTestElement({ x: 10, y: 20, width: 100, height: 50 });
    expect(getElementBounds(el)).toEqual([10, 20, 110, 70]);
  });

  it("handles zero-size element", () => {
    const el = createTestElement({ x: 5, y: 5, width: 0, height: 0 });
    expect(getElementBounds(el)).toEqual([5, 5, 5, 5]);
  });

  it("expands bounds for rotated element", () => {
    const el = createTestElement({
      x: 0,
      y: 0,
      width: 100,
      height: 0,
      angle: (Math.PI / 4) as Radians,
    });
    const [x1, y1, x2, y2] = getElementBounds(el);
    expect(x2 - x1).toBeCloseTo(70.71, 1);
    expect(y2 - y1).toBeCloseTo(70.71, 1);
  });

  it("returns same bounds for 0 and 2*PI rotation", () => {
    const el = createTestElement({
      x: 10,
      y: 20,
      width: 100,
      height: 50,
      angle: (Math.PI * 2) as Radians,
    });
    const bounds = getElementBounds(el);
    expect(bounds[0]).toBeCloseTo(10, 5);
    expect(bounds[1]).toBeCloseTo(20, 5);
    expect(bounds[2]).toBeCloseTo(110, 5);
    expect(bounds[3]).toBeCloseTo(70, 5);
  });
});

describe("getCommonBounds", () => {
  it("returns bounding box encompassing all elements", () => {
    const a = createTestElement({ x: 0, y: 0, width: 50, height: 50 });
    const b = createTestElement({ x: 100, y: 100, width: 50, height: 50 });
    expect(getCommonBounds([a, b])).toEqual([0, 0, 150, 150]);
  });

  it("returns null for empty array", () => {
    expect(getCommonBounds([])).toBeNull();
  });

  it("returns single element bounds for array of one", () => {
    const el = createTestElement({ x: 10, y: 20, width: 30, height: 40 });
    expect(getCommonBounds([el])).toEqual([10, 20, 40, 60]);
  });
});
