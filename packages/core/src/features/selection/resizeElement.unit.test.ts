import { createTestElement } from "../../__test-utils__/factories/element";
import { createTestPoint } from "../../__test-utils__/factories/point";
import { resizeElement } from "./resizeElement";
import type { ResizeState } from "./resizeElement";

describe("resizeElement", () => {
  it("SE handle: increases width and height", () => {
    const el = createTestElement({ x: 0, y: 0, width: 100, height: 100 });
    const state: ResizeState = {
      handleType: "se",
      originalBounds: { x: 0, y: 0, width: 100, height: 100 },
      origin: createTestPoint(100, 100),
    };
    resizeElement(createTestPoint(150, 130), state, el, false);
    expect(el.width).toBe(150);
    expect(el.height).toBe(130);
    expect(el.x).toBe(0);
    expect(el.y).toBe(0);
  });

  it("NW handle: moves origin and shrinks", () => {
    const el = createTestElement({ x: 0, y: 0, width: 100, height: 100 });
    const state: ResizeState = {
      handleType: "nw",
      originalBounds: { x: 0, y: 0, width: 100, height: 100 },
      origin: createTestPoint(0, 0),
    };
    resizeElement(createTestPoint(20, 30), state, el, false);
    expect(el.x).toBe(20);
    expect(el.y).toBe(30);
    expect(el.width).toBe(80);
    expect(el.height).toBe(70);
  });

  it("E handle: only changes width", () => {
    const el = createTestElement({ x: 0, y: 0, width: 100, height: 100 });
    const state: ResizeState = {
      handleType: "e",
      originalBounds: { x: 0, y: 0, width: 100, height: 100 },
      origin: createTestPoint(100, 50),
    };
    resizeElement(createTestPoint(200, 80), state, el, false);
    expect(el.width).toBe(200);
    expect(el.height).toBe(100);
  });

  it("N handle: only changes height and y", () => {
    const el = createTestElement({ x: 0, y: 0, width: 100, height: 100 });
    const state: ResizeState = {
      handleType: "n",
      originalBounds: { x: 0, y: 0, width: 100, height: 100 },
      origin: createTestPoint(50, 0),
    };
    resizeElement(createTestPoint(50, 20), state, el, false);
    expect(el.y).toBe(20);
    expect(el.height).toBe(80);
    expect(el.width).toBe(100);
  });

  it("shift locks aspect ratio", () => {
    const el = createTestElement({ x: 0, y: 0, width: 100, height: 50 });
    const state: ResizeState = {
      handleType: "se",
      originalBounds: { x: 0, y: 0, width: 100, height: 50 },
      origin: createTestPoint(100, 50),
    };
    resizeElement(createTestPoint(200, 80), state, el, true);
    expect(el.width / el.height).toBeCloseTo(2, 5);
  });

  it("negative drag flips to positive dimensions", () => {
    const el = createTestElement({ x: 50, y: 50, width: 100, height: 100 });
    const state: ResizeState = {
      handleType: "se",
      originalBounds: { x: 50, y: 50, width: 100, height: 100 },
      origin: createTestPoint(150, 150),
    };
    resizeElement(createTestPoint(30, 30), state, el, false);
    expect(el.width).toBeGreaterThan(0);
    expect(el.height).toBeGreaterThan(0);
  });

  it("enforces minimum size of 1x1", () => {
    const el = createTestElement({ x: 0, y: 0, width: 100, height: 100 });
    const state: ResizeState = {
      handleType: "se",
      originalBounds: { x: 0, y: 0, width: 100, height: 100 },
      origin: createTestPoint(100, 100),
    };
    resizeElement(createTestPoint(0.1, 0.1), state, el, false);
    expect(el.width).toBeGreaterThanOrEqual(1);
    expect(el.height).toBeGreaterThanOrEqual(1);
  });

  it("enforces minimum size for degenerate dimensions", () => {
    const el = createTestElement({ x: 0, y: 0, width: 100, height: 100 });
    const state: ResizeState = {
      handleType: "se",
      originalBounds: { x: 0, y: 0, width: 100, height: 100 },
      origin: createTestPoint(100, 100),
    };
    // Drag to essentially zero size
    resizeElement(createTestPoint(0, 0), state, el, false);
    expect(el.width).toBeGreaterThanOrEqual(1);
    expect(el.height).toBeGreaterThanOrEqual(1);
  });

  it("handles negative dimensions by flipping", () => {
    const el = createTestElement({ x: 50, y: 50, width: 100, height: 100 });
    const state: ResizeState = {
      handleType: "se",
      originalBounds: { x: 50, y: 50, width: 100, height: 100 },
      origin: createTestPoint(150, 150),
    };
    // Drag well past the opposite edge
    resizeElement(createTestPoint(10, 10), state, el, false);
    expect(el.width).toBeGreaterThan(0);
    expect(el.height).toBeGreaterThan(0);
    // X/Y should have shifted to accommodate the flip
    expect(el.x).toBeLessThanOrEqual(50);
  });

  it("NE handle flips correctly on negative drag", () => {
    const el = createTestElement({ x: 0, y: 0, width: 100, height: 100 });
    const state: ResizeState = {
      handleType: "ne",
      originalBounds: { x: 0, y: 0, width: 100, height: 100 },
      origin: createTestPoint(100, 0),
    };
    // Drag beyond left and bottom edges
    resizeElement(createTestPoint(-50, 150), state, el, false);
    expect(el.width).toBeGreaterThan(0);
    expect(el.height).toBeGreaterThan(0);
  });
});
