import { describe, it, expect, vi } from "vitest";
import { ellipseHandler } from "../ellipseHandler";
import { createTestElement } from "../../../../__test-utils__/factories/element";
import { pointFrom } from "../../../../shared/math";
import type { GlobalPoint } from "../../../../shared/math";
import { isBindableHandler } from "../../../../shared/shapeHandlerRegistry";

describe("ellipseHandler", () => {
  it('has type "ellipse"', () => {
    expect(ellipseHandler.type).toBe("ellipse");
  });

  it("is a bindable handler", () => {
    expect(isBindableHandler(ellipseHandler)).toBe(true);
  });
});

describe("hitTest", () => {
  it("returns true for point inside ellipse", () => {
    const element = createTestElement({ type: "ellipse", x: 0, y: 0, width: 100, height: 100 });
    const point = pointFrom<GlobalPoint>(50, 50);

    expect(ellipseHandler.hitTest(point, element, 10)).toBe(true);
  });

  it("returns false for point at corner of bounding box", () => {
    const element = createTestElement({ type: "ellipse", x: 0, y: 0, width: 100, height: 100 });
    const point = pointFrom<GlobalPoint>(0, 0);

    expect(ellipseHandler.hitTest(point, element, 0)).toBe(false);
  });
});

describe("getBounds", () => {
  it("returns element bounds", () => {
    const element = createTestElement({ type: "ellipse", x: 10, y: 20, width: 100, height: 50 });
    const bounds = ellipseHandler.getBounds(element);

    expect(bounds).toEqual([10, 20, 110, 70]);
  });
});

describe("distanceToEdge", () => {
  it("returns approximately 0 for point on edge", () => {
    const element = createTestElement({ type: "ellipse", x: 0, y: 0, width: 100, height: 100 });
    // Right edge of a circle centered at (50,50) with radius 50 is at (100, 50)
    const point = pointFrom<GlobalPoint>(100, 50);

    expect(ellipseHandler.distanceToEdge(element, point)).toBeCloseTo(0, 0);
  });
});

describe("isPointInside", () => {
  it("returns true for center point", () => {
    const element = createTestElement({ type: "ellipse", x: 0, y: 0, width: 100, height: 100 });
    const point = pointFrom<GlobalPoint>(50, 50);

    expect(ellipseHandler.isPointInside(element, point)).toBe(true);
  });

  it("returns false for corner point", () => {
    const element = createTestElement({ type: "ellipse", x: 0, y: 0, width: 100, height: 100 });
    const point = pointFrom<GlobalPoint>(0, 0);

    expect(ellipseHandler.isPointInside(element, point)).toBe(false);
  });
});

describe("projectOntoEdge", () => {
  it("projects rightward from center", () => {
    const element = createTestElement({ type: "ellipse", x: 0, y: 0, width: 100, height: 100 });
    // Circle center at (50,50), radius 50, direction (1,0) -> (100, 50)
    const result = ellipseHandler.projectOntoEdge(element, 50, 50, 1, 0);

    expect(result[0]).toBeCloseTo(100, 5);
    expect(result[1]).toBeCloseTo(50, 5);
  });
});

describe("drawHighlight", () => {
  it("calls ellipse on context", () => {
    const element = createTestElement({ type: "ellipse", x: 0, y: 0, width: 100, height: 100 });
    const mockCtx = {
      strokeRect: vi.fn(),
      beginPath: vi.fn(),
      ellipse: vi.fn(),
      stroke: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    ellipseHandler.drawHighlight(mockCtx, element, 5);

    expect(mockCtx.beginPath).toHaveBeenCalledOnce();
    expect(mockCtx.ellipse).toHaveBeenCalledOnce();
    expect(mockCtx.stroke).toHaveBeenCalledOnce();
  });
});
