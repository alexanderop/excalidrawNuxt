import { describe, it, expect } from "vitest";
import { pointFrom } from "../../shared/math";
import type { GlobalPoint } from "../../shared/math";
import { createTestElement } from "../../__test-utils__/factories/element";
import { rotateElement } from "./rotateElement";

function makeElement(overrides?: Record<string, unknown>) {
  return createTestElement({ x: 100, y: 100, width: 200, height: 200, ...overrides });
}

describe("rotateElement", () => {
  it("sets angle to 0 when pointer is directly above center", () => {
    const el = makeElement();
    // Center is (200, 200). Pointer directly above → angle = 0
    const point = pointFrom<GlobalPoint>(200, 0);
    rotateElement(point, el, false);
    expect(el.angle).toBeCloseTo(0, 2);
  });

  it("sets angle to ~π/2 when pointer is to the right of center", () => {
    const el = makeElement();
    // Center is (200, 200). Pointer to the right → angle ≈ π/2
    const point = pointFrom<GlobalPoint>(400, 200);
    rotateElement(point, el, false);
    expect(el.angle).toBeCloseTo(Math.PI / 2, 1);
  });

  it("sets angle to ~π when pointer is directly below center", () => {
    const el = makeElement();
    // Center is (200, 200). Pointer below → angle ≈ π
    const point = pointFrom<GlobalPoint>(200, 400);
    rotateElement(point, el, false);
    expect(el.angle).toBeCloseTo(Math.PI, 1);
  });

  it("sets angle to ~3π/2 when pointer is to the left of center", () => {
    const el = makeElement();
    // Center is (200, 200). Pointer to the left → angle ≈ 3π/2
    const point = pointFrom<GlobalPoint>(0, 200);
    rotateElement(point, el, false);
    expect(el.angle).toBeCloseTo((3 * Math.PI) / 2, 1);
  });

  it("snaps to 15-degree increments when shift is held", () => {
    const el = makeElement();
    // Pointer slightly off 90° → should snap to exactly π/2
    const point = pointFrom<GlobalPoint>(400, 210);
    rotateElement(point, el, true);

    const snapIncrement = Math.PI / 12;
    const remainder = el.angle % snapIncrement;
    const snapped = remainder < 0.001 || Math.abs(remainder - snapIncrement) < 0.001;
    expect(snapped).toBe(true);
  });

  it("does not change width or height", () => {
    const el = makeElement();
    const origWidth = el.width;
    const origHeight = el.height;
    const point = pointFrom<GlobalPoint>(400, 200);
    rotateElement(point, el, false);
    expect(el.width).toBe(origWidth);
    expect(el.height).toBe(origHeight);
  });

  it("does not change x or y", () => {
    const el = makeElement();
    const origX = el.x;
    const origY = el.y;
    const point = pointFrom<GlobalPoint>(400, 200);
    rotateElement(point, el, false);
    expect(el.x).toBe(origX);
    expect(el.y).toBe(origY);
  });

  it("normalizes angle to [0, 2π)", () => {
    const el = makeElement();
    // Any pointer position should give normalized angle
    const point = pointFrom<GlobalPoint>(150, 50);
    rotateElement(point, el, false);
    expect(el.angle).toBeGreaterThanOrEqual(0);
    expect(el.angle).toBeLessThan(2 * Math.PI);
  });

  it("snaps to exactly 0 when pointer is near top and shift is held", () => {
    const el = makeElement();
    // Pointer slightly off from directly above → should snap to 0
    const point = pointFrom<GlobalPoint>(205, 0);
    rotateElement(point, el, true);
    expect(el.angle).toBeCloseTo(0, 2);
  });

  it("snaps to exactly π/4 (45°) when shift is held", () => {
    const el = makeElement();
    // Pointer at ~45° from top → northeast direction
    // Center is (200, 200). 45° clockwise from top = upper-right diagonal
    const offset = 200;
    const point = pointFrom<GlobalPoint>(
      200 + offset * Math.sin(Math.PI / 4),
      200 - offset * Math.cos(Math.PI / 4),
    );
    rotateElement(point, el, true);
    expect(el.angle).toBeCloseTo(Math.PI / 4, 2);
  });
});
