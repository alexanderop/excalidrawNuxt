import { describe, it, expect, vi } from "vitest";
import type { ShapeHandler, BindableShapeHandler } from "../shapeHandlerRegistry";
import { createShapeHandlerRegistry, isBindableHandler } from "../shapeHandlerRegistry";
import { registerDefaultHandlers } from "../../features/rendering/handlers";
import { createTestElement } from "../../__test-utils__/factories/element";
import type { SupportedElementType } from "../../features/elements/types";

function makeShapeHandler(type: SupportedElementType): ShapeHandler {
  return {
    type,
    render: vi.fn(),
    hitTest: vi.fn(),
    getBounds: vi.fn(),
  };
}

function makeBindableHandler(type: SupportedElementType): BindableShapeHandler {
  return {
    type,
    render: vi.fn(),
    hitTest: vi.fn(),
    getBounds: vi.fn(),
    distanceToEdge: vi.fn(),
    isPointInside: vi.fn(),
    projectOntoEdge: vi.fn(),
    drawHighlight: vi.fn(),
  };
}

describe("createShapeHandlerRegistry", () => {
  it("registers and retrieves a handler by type", () => {
    const registry = createShapeHandlerRegistry();
    const handler = makeShapeHandler("rectangle");
    registry.register(handler);

    const element = createTestElement({ type: "rectangle" });
    expect(registry.getHandler(element)).toBe(handler);
  });

  it("throws for unregistered type", () => {
    const registry = createShapeHandlerRegistry();
    const element = createTestElement({ type: "rectangle" });

    expect(() => registry.getHandler(element)).toThrow(
      "No shape handler registered for type: rectangle",
    );
  });

  it("returns true for hasHandler when registered", () => {
    const registry = createShapeHandlerRegistry();
    registry.register(makeShapeHandler("ellipse"));

    expect(registry.hasHandler("ellipse")).toBe(true);
  });

  it("returns false for hasHandler when not registered", () => {
    const registry = createShapeHandlerRegistry();

    expect(registry.hasHandler("ellipse")).toBe(false);
  });

  it("retrieves handler by type string via getHandlerByType", () => {
    const registry = createShapeHandlerRegistry();
    const handler = makeShapeHandler("diamond");
    registry.register(handler);

    expect(registry.getHandlerByType("diamond")).toBe(handler);
  });

  it("throws from getHandlerByType for unregistered type", () => {
    const registry = createShapeHandlerRegistry();

    expect(() => registry.getHandlerByType("diamond")).toThrow(
      "No shape handler registered for type: diamond",
    );
  });
});

describe("isBindableHandler", () => {
  it("returns true for handler with binding methods", () => {
    const handler = makeBindableHandler("rectangle");

    expect(isBindableHandler(handler)).toBe(true);
  });

  it("returns false for handler without binding methods", () => {
    const handler = makeShapeHandler("text");

    expect(isBindableHandler(handler)).toBe(false);
  });
});

describe("registerDefaultHandlers", () => {
  it("registers all 8 element types", () => {
    const registry = createShapeHandlerRegistry();
    registerDefaultHandlers(registry);

    const expectedTypes: SupportedElementType[] = [
      "rectangle",
      "ellipse",
      "diamond",
      "arrow",
      "line",
      "text",
      "freedraw",
      "image",
    ];

    for (const type of expectedTypes) {
      expect(registry.hasHandler(type)).toBe(true);
    }
  });
});
