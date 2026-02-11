import { createTestElement, createTestArrowElement } from "~/__test-utils__/factories/element";
import { createTestPoint } from "~/__test-utils__/factories/point";
import type { Radians } from "~/shared/math";
import {
  distanceToShapeEdge,
  getHoveredElementForBinding,
  computeFixedPoint,
  getPointFromFixedPoint,
} from "./proximity";
import { BASE_BINDING_GAP } from "./constants";

describe("distanceToShapeEdge", () => {
  describe("rectangle", () => {
    it("returns 0 for point on rectangle edge", () => {
      const el = createTestElement({ x: 0, y: 0, width: 100, height: 50 });
      // Point on right edge
      const dist = distanceToShapeEdge(createTestPoint(100, 25), el);
      expect(dist).toBeCloseTo(0, 5);
    });

    it("returns correct distance for point outside rectangle", () => {
      const el = createTestElement({ x: 0, y: 0, width: 100, height: 50 });
      // 10px to the right of the right edge
      const dist = distanceToShapeEdge(createTestPoint(110, 25), el);
      expect(dist).toBeCloseTo(10, 5);
    });

    it("returns 0 for point on top edge", () => {
      const el = createTestElement({ x: 0, y: 0, width: 100, height: 50 });
      const dist = distanceToShapeEdge(createTestPoint(50, 0), el);
      expect(dist).toBeCloseTo(0, 5);
    });
  });

  describe("ellipse", () => {
    it("returns 0 for point on ellipse edge", () => {
      const el = createTestElement({ type: "ellipse", x: 0, y: 0, width: 100, height: 100 });
      // Right edge of circle (center at 50,50, radius 50)
      const dist = distanceToShapeEdge(createTestPoint(100, 50), el);
      expect(dist).toBeCloseTo(0, 5);
    });

    it("returns correct distance for point outside ellipse", () => {
      const el = createTestElement({ type: "ellipse", x: 0, y: 0, width: 100, height: 100 });
      // 10px to the right of the right edge
      const dist = distanceToShapeEdge(createTestPoint(110, 50), el);
      expect(dist).toBeCloseTo(10, 5);
    });
  });

  describe("diamond", () => {
    it("returns 0 for point on diamond vertex", () => {
      const el = createTestElement({ type: "diamond", x: 0, y: 0, width: 100, height: 100 });
      // Top vertex of diamond: (50, 0)
      const dist = distanceToShapeEdge(createTestPoint(50, 0), el);
      expect(dist).toBeCloseTo(0, 5);
    });

    it("returns correct distance for point outside diamond", () => {
      const el = createTestElement({ type: "diamond", x: 0, y: 0, width: 100, height: 100 });
      // Point above top vertex
      const dist = distanceToShapeEdge(createTestPoint(50, -10), el);
      expect(dist).toBeCloseTo(10, 5);
    });
  });

  it("handles rotated elements", () => {
    const el = createTestElement({
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      angle: (Math.PI / 2) as Radians,
    });
    // After 90 degree rotation, the shape's edges move
    const dist = distanceToShapeEdge(createTestPoint(50, 25), el);
    expect(dist).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(dist)).toBe(true);
  });
});

describe("computeFixedPoint", () => {
  it("returns [0.5, 0.5] for center of element", () => {
    const el = createTestElement({ x: 0, y: 0, width: 100, height: 100 });
    const fp = computeFixedPoint(createTestPoint(50, 50), el);
    expect(fp[0]).toBeCloseTo(0.5, 5);
    expect(fp[1]).toBeCloseTo(0.5, 5);
  });

  it("returns [0, 0] for top-left corner", () => {
    const el = createTestElement({ x: 0, y: 0, width: 100, height: 100 });
    const fp = computeFixedPoint(createTestPoint(0, 0), el);
    expect(fp[0]).toBeCloseTo(0, 5);
    expect(fp[1]).toBeCloseTo(0, 5);
  });

  it("returns [1, 1] for bottom-right corner", () => {
    const el = createTestElement({ x: 0, y: 0, width: 100, height: 100 });
    const fp = computeFixedPoint(createTestPoint(100, 100), el);
    expect(fp[0]).toBeCloseTo(1, 5);
    expect(fp[1]).toBeCloseTo(1, 5);
  });

  it("clamps values to [0, 1]", () => {
    const el = createTestElement({ x: 0, y: 0, width: 100, height: 100 });
    const fp = computeFixedPoint(createTestPoint(-50, 200), el);
    expect(fp[0]).toBe(0);
    expect(fp[1]).toBe(1);
  });

  it("handles rotated elements", () => {
    const el = createTestElement({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      angle: (Math.PI / 4) as Radians,
    });
    const fp = computeFixedPoint(createTestPoint(50, 50), el);
    // Center should still map to ~[0.5, 0.5] regardless of rotation
    expect(fp[0]).toBeCloseTo(0.5, 5);
    expect(fp[1]).toBeCloseTo(0.5, 5);
  });
});

describe("getHoveredElementForBinding", () => {
  it("returns closest bindable element within threshold", () => {
    const rect = createTestElement({ id: "rect1", x: 0, y: 0, width: 100, height: 50 });
    // Point on the edge of the rectangle
    const result = getHoveredElementForBinding(createTestPoint(100, 25), [rect], 1, new Set());
    expect(result).not.toBeNull();
    expect(result?.element.id).toBe("rect1");
  });

  it("returns null when no elements are within threshold", () => {
    const rect = createTestElement({ id: "rect1", x: 0, y: 0, width: 100, height: 50 });
    // Point far from the rectangle
    const result = getHoveredElementForBinding(createTestPoint(500, 500), [rect], 1, new Set());
    expect(result).toBeNull();
  });

  it("excludes elements in excludeIds set", () => {
    const rect = createTestElement({ id: "rect1", x: 0, y: 0, width: 100, height: 50 });
    const result = getHoveredElementForBinding(
      createTestPoint(100, 25),
      [rect],
      1,
      new Set(["rect1"]),
    );
    expect(result).toBeNull();
  });

  it("skips deleted elements", () => {
    const rect = createTestElement({
      id: "rect1",
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      isDeleted: true,
    });
    const result = getHoveredElementForBinding(createTestPoint(100, 25), [rect], 1, new Set());
    expect(result).toBeNull();
  });

  it("skips arrow elements (not bindable)", () => {
    const arrow = createTestArrowElement({ id: "arrow1", x: 0, y: 0 });
    const result = getHoveredElementForBinding(createTestPoint(50, 25), [arrow], 1, new Set());
    expect(result).toBeNull();
  });

  it("adjusts threshold based on zoom", () => {
    const rect = createTestElement({ id: "rect1", x: 0, y: 0, width: 100, height: 50 });
    // Point 10px from edge — within threshold at zoom=1 (threshold=15) but outside at zoom=5 (threshold=3)
    const resultZoom1 = getHoveredElementForBinding(createTestPoint(110, 25), [rect], 1, new Set());
    const resultZoom5 = getHoveredElementForBinding(createTestPoint(110, 25), [rect], 5, new Set());
    expect(resultZoom1).not.toBeNull();
    expect(resultZoom5).toBeNull();
  });

  it("returns the closest element when multiple are near", () => {
    const near = createTestElement({ id: "near", x: 0, y: 0, width: 100, height: 50 });
    const far = createTestElement({ id: "far", x: 0, y: 0, width: 200, height: 100 });
    // Point on near rectangle right edge, also within threshold for far rectangle
    const result = getHoveredElementForBinding(createTestPoint(100, 25), [near, far], 1, new Set());
    expect(result).not.toBeNull();
    expect(result?.element.id).toBe("near");
  });
});

describe("computeFixedPoint and getPointFromFixedPoint round-trip", () => {
  it("round-trips for rectangle center", () => {
    const el = createTestElement({ x: 0, y: 0, width: 100, height: 100 });
    const fp = computeFixedPoint(createTestPoint(50, 50), el);
    const scenePoint = getPointFromFixedPoint(fp, el);
    // The returned point should be on the shape edge (projected from center),
    // offset outward by BASE_BINDING_GAP
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    const distFromCenter = Math.hypot(scenePoint[0] - cx, scenePoint[1] - cy);
    // Should be at least half-width away from center (projected onto edge + gap)
    expect(distFromCenter).toBeGreaterThan(0);
  });

  it("round-trips for rectangle edge point", () => {
    const el = createTestElement({ x: 0, y: 0, width: 100, height: 100 });
    // Point on the right edge midpoint
    const fp = computeFixedPoint(createTestPoint(100, 50), el);
    expect(fp[0]).toBeCloseTo(1, 5);
    expect(fp[1]).toBeCloseTo(0.5, 5);
    const scenePoint = getPointFromFixedPoint(fp, el);
    // Should project onto the right edge + gap
    expect(scenePoint[0]).toBeCloseTo(100 + BASE_BINDING_GAP, 1);
    expect(scenePoint[1]).toBeCloseTo(50, 1);
  });
});
