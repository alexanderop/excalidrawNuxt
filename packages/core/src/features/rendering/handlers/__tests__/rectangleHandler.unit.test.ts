import { describe, it, expect, vi } from "vitest";
import { rectangleHandler } from "../rectangleHandler";
import { createTestElement } from "../../../../__test-utils__/factories/element";
import { pointFrom } from "../../../../shared/math";
import type { GlobalPoint } from "../../../../shared/math";
import { isBindableHandler } from "../../../../shared/shapeHandlerRegistry";

describe("rectangleHandler", () => {
  it('has type "rectangle"', () => {
    expect(rectangleHandler.type).toBe("rectangle");
  });

  it("is a bindable handler", () => {
    expect(isBindableHandler(rectangleHandler)).toBe(true);
  });
});

describe("hitTest", () => {
  it("returns true for point inside rectangle", () => {
    const element = createTestElement({ x: 0, y: 0, width: 100, height: 100 });
    const point = pointFrom<GlobalPoint>(50, 50);

    expect(rectangleHandler.hitTest(point, element, 10)).toBe(true);
  });

  it("returns false for point outside rectangle", () => {
    const element = createTestElement({ x: 0, y: 0, width: 100, height: 100 });
    const point = pointFrom<GlobalPoint>(200, 200);

    expect(rectangleHandler.hitTest(point, element, 10)).toBe(false);
  });

  it("returns true for point within threshold of edge", () => {
    const element = createTestElement({ x: 0, y: 0, width: 100, height: 100 });
    const point = pointFrom<GlobalPoint>(-5, 50);

    expect(rectangleHandler.hitTest(point, element, 10)).toBe(true);
  });
});

describe("getBounds", () => {
  it("returns element bounds", () => {
    const element = createTestElement({ x: 10, y: 20, width: 100, height: 50 });
    const bounds = rectangleHandler.getBounds(element);

    expect(bounds).toEqual([10, 20, 110, 70]);
  });
});

describe("distanceToEdge", () => {
  it("returns 0 for point on edge", () => {
    const element = createTestElement({ x: 0, y: 0, width: 100, height: 100 });
    const point = pointFrom<GlobalPoint>(0, 50);

    expect(rectangleHandler.distanceToEdge(element, point)).toBeCloseTo(0, 5);
  });

  it("returns positive distance for point outside", () => {
    const element = createTestElement({ x: 0, y: 0, width: 100, height: 100 });
    const point = pointFrom<GlobalPoint>(-10, 50);

    expect(rectangleHandler.distanceToEdge(element, point)).toBeCloseTo(10, 5);
  });
});

describe("isPointInside", () => {
  it("returns true for point inside", () => {
    const element = createTestElement({ x: 0, y: 0, width: 100, height: 100 });
    const point = pointFrom<GlobalPoint>(50, 50);

    expect(rectangleHandler.isPointInside(element, point)).toBe(true);
  });

  it("returns false for point outside", () => {
    const element = createTestElement({ x: 0, y: 0, width: 100, height: 100 });
    const point = pointFrom<GlobalPoint>(150, 50);

    expect(rectangleHandler.isPointInside(element, point)).toBe(false);
  });
});

describe("projectOntoEdge", () => {
  it("projects rightward from center onto right edge", () => {
    const element = createTestElement({ x: 0, y: 0, width: 100, height: 100 });
    const result = rectangleHandler.projectOntoEdge(element, 50, 50, 1, 0);

    expect(result[0]).toBeCloseTo(100, 5);
    expect(result[1]).toBeCloseTo(50, 5);
  });
});

describe("drawHighlight", () => {
  it("calls strokeRect on context", () => {
    const element = createTestElement({ x: 0, y: 0, width: 100, height: 100 });
    const mockCtx = {
      strokeRect: vi.fn(),
      beginPath: vi.fn(),
      ellipse: vi.fn(),
      stroke: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    rectangleHandler.drawHighlight(mockCtx, element, 5);

    expect(mockCtx.strokeRect).toHaveBeenCalledOnce();
  });
});
