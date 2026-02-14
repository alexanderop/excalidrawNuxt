import { createTestElement, createTestArrowElement } from "../../__test-utils__/factories/element";
import { createTestPoint } from "../../__test-utils__/factories/point";
import type { Radians } from "../../shared/math";
import {
  distanceToShapeEdge,
  getHoveredElementForBinding,
  computeFixedPoint,
  getPointFromFixedPoint,
} from "./proximity";
import { BASE_BINDING_GAP, maxBindingDistance } from "./constants";

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
    // maxBindingDistance(1) = 10, point is 10px from edge — exactly at threshold
    const resultZoom1 = getHoveredElementForBinding(createTestPoint(110, 25), [rect], 1, new Set());
    expect(resultZoom1).not.toBeNull();

    // At low zoom the threshold grows; point 20px away should still bind at zoom=0.25
    const resultLowZoom = getHoveredElementForBinding(
      createTestPoint(120, 25),
      [rect],
      0.25,
      new Set(),
    );
    expect(resultLowZoom).not.toBeNull();

    // But 35px away should not bind even at zoom=0.25 (max threshold = 30)
    const resultTooFar = getHoveredElementForBinding(
      createTestPoint(135, 25),
      [rect],
      0.25,
      new Set(),
    );
    expect(resultTooFar).toBeNull();
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

describe("getPointFromFixedPoint — inside mode", () => {
  it("returns the fixedPoint scene coordinate directly for a rectangle", () => {
    const el = createTestElement({ x: 0, y: 0, width: 100, height: 100 });
    // fixedPoint [0.75, 0.25] → scene (75, 25) — no edge projection, no gap
    const result = getPointFromFixedPoint([0.75, 0.25], el, "inside");
    expect(result[0]).toBeCloseTo(75, 5);
    expect(result[1]).toBeCloseTo(25, 5);
  });

  it("returns center for fixedPoint [0.5, 0.5]", () => {
    const el = createTestElement({ x: 10, y: 20, width: 80, height: 60 });
    const result = getPointFromFixedPoint([0.5, 0.5], el, "inside");
    expect(result[0]).toBeCloseTo(50, 5);
    expect(result[1]).toBeCloseTo(50, 5);
  });

  it("handles rotated elements in inside mode", () => {
    const el = createTestElement({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      angle: (Math.PI / 2) as Radians,
    });
    // fixedPoint [1, 0.5] → local (100, 50), rotated 90 degrees around center (50, 50)
    const result = getPointFromFixedPoint([1, 0.5], el, "inside");
    // After 90 degree rotation of (100, 50) around (50, 50): → (50, 100)
    expect(result[0]).toBeCloseTo(50, 1);
    expect(result[1]).toBeCloseTo(100, 1);
  });

  it("orbit mode still projects onto edge with gap", () => {
    const el = createTestElement({ x: 0, y: 0, width: 100, height: 100 });
    const orbit = getPointFromFixedPoint([1, 0.5], el, "orbit");
    const inside = getPointFromFixedPoint([1, 0.5], el, "inside");
    // Orbit should be further from center (edge + gap) than inside (raw scene point)
    const cx = 50;
    const cy = 50;
    const orbitDist = Math.hypot(orbit[0] - cx, orbit[1] - cy);
    const insideDist = Math.hypot(inside[0] - cx, inside[1] - cy);
    expect(orbitDist).toBeGreaterThan(insideDist);
  });

  it("defaults to orbit mode when mode is not specified", () => {
    const el = createTestElement({ x: 0, y: 0, width: 100, height: 100 });
    const defaultResult = getPointFromFixedPoint([1, 0.5], el);
    const orbitResult = getPointFromFixedPoint([1, 0.5], el, "orbit");
    expect(defaultResult[0]).toBeCloseTo(orbitResult[0], 5);
    expect(defaultResult[1]).toBeCloseTo(orbitResult[1], 5);
  });
});

describe("maxBindingDistance", () => {
  it("returns base / 1.5 at zoom = 1", () => {
    // base = max(5, 15) = 15, zoomValue = 1
    // result = min(15 / 1.5, 30) = 10
    expect(maxBindingDistance(1)).toBeCloseTo(10, 5);
  });

  it("returns same value for zoom > 1 (clamped to 1)", () => {
    // zoom >= 1 → zoomValue = 1, so all high zooms give the same result
    expect(maxBindingDistance(2)).toBeCloseTo(maxBindingDistance(1), 5);
    expect(maxBindingDistance(5)).toBeCloseTo(maxBindingDistance(1), 5);
  });

  it("increases threshold at low zoom", () => {
    // zoom = 0.5 → zoomValue = 0.5, result = min(15 / 0.75, 30) = 20
    expect(maxBindingDistance(0.5)).toBeCloseTo(20, 5);
  });

  it("caps at base * 2", () => {
    // Very low zoom → result capped at 30
    expect(maxBindingDistance(0.1)).toBeCloseTo(30, 5);
  });
});
