import { describe, it, expect, vi } from "vitest";
import { diamondHandler } from "../diamondHandler";
import { createTestElement } from "../../../../__test-utils__/factories/element";
import { pointFrom } from "../../../../shared/math";
import type { GlobalPoint } from "../../../../shared/math";
import { isBindableHandler } from "../../../../shared/shapeHandlerRegistry";

describe("diamondHandler", () => {
  it('has type "diamond"', () => {
    expect(diamondHandler.type).toBe("diamond");
  });

  it("is a bindable handler", () => {
    expect(isBindableHandler(diamondHandler)).toBe(true);
  });
});

describe("hitTest", () => {
  it("returns true for center point", () => {
    const element = createTestElement({ type: "diamond", x: 0, y: 0, width: 100, height: 100 });
    const point = pointFrom<GlobalPoint>(50, 50);

    expect(diamondHandler.hitTest(point, element, 0)).toBe(true);
  });

  it("returns false for corner point", () => {
    const element = createTestElement({ type: "diamond", x: 0, y: 0, width: 100, height: 100 });
    const point = pointFrom<GlobalPoint>(0, 0);

    expect(diamondHandler.hitTest(point, element, 0)).toBe(false);
  });
});

describe("getBounds", () => {
  it("returns element bounds", () => {
    const element = createTestElement({ type: "diamond", x: 10, y: 20, width: 100, height: 50 });
    const bounds = diamondHandler.getBounds(element);

    expect(bounds).toEqual([10, 20, 110, 70]);
  });
});

describe("isPointInside", () => {
  it("returns true for center", () => {
    const element = createTestElement({ type: "diamond", x: 0, y: 0, width: 100, height: 100 });
    const point = pointFrom<GlobalPoint>(50, 50);

    expect(diamondHandler.isPointInside(element, point)).toBe(true);
  });

  it("returns false for corner", () => {
    const element = createTestElement({ type: "diamond", x: 0, y: 0, width: 100, height: 100 });
    const point = pointFrom<GlobalPoint>(0, 0);

    expect(diamondHandler.isPointInside(element, point)).toBe(false);
  });
});

describe("projectOntoEdge", () => {
  it("projects onto edge", () => {
    const element = createTestElement({ type: "diamond", x: 0, y: 0, width: 100, height: 100 });
    // Center at (50,50), direction (1,0) — should hit the right vertex at (100, 50)
    // Diamond vertices relative to center: right is at (hw, 0) = (50, 0) relative
    // So absolute right vertex is (100, 50)
    const result = diamondHandler.projectOntoEdge(element, 50, 50, 1, 0);

    expect(result[0]).toBeCloseTo(100, 5);
    expect(result[1]).toBeCloseTo(50, 5);
  });
});

describe("drawHighlight", () => {
  it("draws diamond path on context", () => {
    const element = createTestElement({ type: "diamond", x: 0, y: 0, width: 100, height: 100 });
    const mockCtx = {
      strokeRect: vi.fn(),
      beginPath: vi.fn(),
      ellipse: vi.fn(),
      stroke: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    diamondHandler.drawHighlight(mockCtx, element, 5);

    expect(mockCtx.beginPath).toHaveBeenCalledOnce();
    expect(mockCtx.moveTo).toHaveBeenCalledOnce();
    expect(mockCtx.lineTo).toHaveBeenCalledTimes(3);
    expect(mockCtx.closePath).toHaveBeenCalledOnce();
    expect(mockCtx.stroke).toHaveBeenCalledOnce();
  });
});
