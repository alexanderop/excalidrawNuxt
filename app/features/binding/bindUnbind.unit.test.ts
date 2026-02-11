import { createTestElement, createTestArrowElement } from "~/__test-utils__/factories/element";
import type { FixedPointBinding } from "~/features/elements/types";
import {
  bindArrowToElement,
  unbindArrowEndpoint,
  unbindAllArrowsFromShape,
  unbindArrow,
  findBindableElement,
} from "./bindUnbind";

describe("bindArrowToElement", () => {
  it("sets start binding on arrow", () => {
    const arrow = createTestArrowElement({ id: "arrow1" });
    const rect = createTestElement({ id: "rect1", x: 0, y: 0, width: 100, height: 50 });
    const fixedPoint: readonly [number, number] = [0.5, 0.5];

    bindArrowToElement(arrow, "start", rect, fixedPoint);

    expect(arrow.startBinding).not.toBeNull();
    expect(arrow.startBinding?.elementId).toBe("rect1");
    expect((arrow.startBinding as FixedPointBinding).fixedPoint).toEqual([0.5, 0.5]);
  });

  it("sets end binding on arrow", () => {
    const arrow = createTestArrowElement({ id: "arrow1" });
    const rect = createTestElement({ id: "rect1", x: 0, y: 0, width: 100, height: 50 });
    const fixedPoint: readonly [number, number] = [1, 0.5];

    bindArrowToElement(arrow, "end", rect, fixedPoint);

    expect(arrow.endBinding).not.toBeNull();
    expect(arrow.endBinding?.elementId).toBe("rect1");
    expect((arrow.endBinding as FixedPointBinding).fixedPoint).toEqual([1, 0.5]);
  });

  it("adds arrow to target boundElements", () => {
    const arrow = createTestArrowElement({ id: "arrow1" });
    const rect = createTestElement({ id: "rect1", x: 0, y: 0, width: 100, height: 50 });
    const fixedPoint: readonly [number, number] = [0.5, 0.5];

    bindArrowToElement(arrow, "start", rect, fixedPoint);

    expect(rect.boundElements).toHaveLength(1);
    expect(rect.boundElements![0]).toEqual({ id: "arrow1", type: "arrow" });
  });

  it("does not duplicate boundElements entry on repeated bind", () => {
    const arrow = createTestArrowElement({ id: "arrow1" });
    const rect = createTestElement({ id: "rect1", x: 0, y: 0, width: 100, height: 50 });
    const fixedPoint: readonly [number, number] = [0.5, 0.5];

    bindArrowToElement(arrow, "start", rect, fixedPoint);
    bindArrowToElement(arrow, "end", rect, fixedPoint);

    expect(rect.boundElements).toHaveLength(1);
  });
});

describe("unbindArrowEndpoint", () => {
  it("clears start binding from arrow", () => {
    const arrow = createTestArrowElement({ id: "arrow1" });
    const rect = createTestElement({ id: "rect1", x: 0, y: 0, width: 100, height: 50 });
    bindArrowToElement(arrow, "start", rect, [0.5, 0.5]);

    unbindArrowEndpoint(arrow, "start", [arrow, rect]);

    expect(arrow.startBinding).toBeNull();
  });

  it("clears end binding from arrow", () => {
    const arrow = createTestArrowElement({ id: "arrow1" });
    const rect = createTestElement({ id: "rect1", x: 0, y: 0, width: 100, height: 50 });
    bindArrowToElement(arrow, "end", rect, [0.5, 0.5]);

    unbindArrowEndpoint(arrow, "end", [arrow, rect]);

    expect(arrow.endBinding).toBeNull();
  });

  it("removes arrow from shape boundElements", () => {
    const arrow = createTestArrowElement({ id: "arrow1" });
    const rect = createTestElement({ id: "rect1", x: 0, y: 0, width: 100, height: 50 });
    bindArrowToElement(arrow, "start", rect, [0.5, 0.5]);

    unbindArrowEndpoint(arrow, "start", [arrow, rect]);

    expect(rect.boundElements).toHaveLength(0);
  });

  it("is no-op when binding is null", () => {
    const arrow = createTestArrowElement({ id: "arrow1" });
    const rect = createTestElement({ id: "rect1", x: 0, y: 0, width: 100, height: 50 });

    // Should not throw
    unbindArrowEndpoint(arrow, "start", [arrow, rect]);

    expect(arrow.startBinding).toBeNull();
    expect(rect.boundElements ?? []).toHaveLength(0);
  });

  it("handles missing shape gracefully", () => {
    const arrow = createTestArrowElement({ id: "arrow1" });
    const rect = createTestElement({ id: "rect1", x: 0, y: 0, width: 100, height: 50 });
    bindArrowToElement(arrow, "start", rect, [0.5, 0.5]);

    // Pass elements array without the rect
    unbindArrowEndpoint(arrow, "start", [arrow]);

    expect(arrow.startBinding).toBeNull();
  });
});

describe("unbindAllArrowsFromShape", () => {
  it("clears all arrow bindings referencing shape", () => {
    const rect = createTestElement({ id: "rect1", x: 0, y: 0, width: 100, height: 50 });
    const arrow1 = createTestArrowElement({ id: "arrow1" });
    const arrow2 = createTestArrowElement({ id: "arrow2" });
    bindArrowToElement(arrow1, "start", rect, [0.5, 0.5]);
    bindArrowToElement(arrow2, "end", rect, [0.5, 0.5]);

    unbindAllArrowsFromShape(rect, [rect, arrow1, arrow2]);

    expect(arrow1.startBinding).toBeNull();
    expect(arrow2.endBinding).toBeNull();
  });

  it("empties shape boundElements", () => {
    const rect = createTestElement({ id: "rect1", x: 0, y: 0, width: 100, height: 50 });
    const arrow = createTestArrowElement({ id: "arrow1" });
    bindArrowToElement(arrow, "start", rect, [0.5, 0.5]);

    unbindAllArrowsFromShape(rect, [rect, arrow]);

    expect(rect.boundElements).toHaveLength(0);
  });

  it("is no-op for shape with no boundElements", () => {
    const rect = createTestElement({ id: "rect1", x: 0, y: 0, width: 100, height: 50 });

    // Should not throw
    unbindAllArrowsFromShape(rect, [rect]);

    expect(rect.boundElements ?? []).toHaveLength(0);
  });
});

describe("unbindArrow", () => {
  it("unbinds both endpoints", () => {
    const rect1 = createTestElement({ id: "rect1", x: 0, y: 0, width: 100, height: 50 });
    const rect2 = createTestElement({ id: "rect2", x: 200, y: 0, width: 100, height: 50 });
    const arrow = createTestArrowElement({ id: "arrow1" });
    bindArrowToElement(arrow, "start", rect1, [1, 0.5]);
    bindArrowToElement(arrow, "end", rect2, [0, 0.5]);

    unbindArrow(arrow, [arrow, rect1, rect2]);

    expect(arrow.startBinding).toBeNull();
    expect(arrow.endBinding).toBeNull();
    expect(rect1.boundElements).toHaveLength(0);
    expect(rect2.boundElements).toHaveLength(0);
  });
});

describe("findBindableElement", () => {
  it("returns element by id", () => {
    const rect = createTestElement({ id: "rect1", x: 0, y: 0, width: 100, height: 50 });
    const result = findBindableElement("rect1", [rect]);
    expect(result).toBe(rect);
  });

  it("returns null for deleted elements", () => {
    const rect = createTestElement({
      id: "rect1",
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      isDeleted: true,
    });
    const result = findBindableElement("rect1", [rect]);
    expect(result).toBeNull();
  });

  it("returns null for arrow elements", () => {
    const arrow = createTestArrowElement({ id: "arrow1" });
    const result = findBindableElement("arrow1", [arrow]);
    expect(result).toBeNull();
  });

  it("returns null for non-existent id", () => {
    const rect = createTestElement({ id: "rect1" });
    const result = findBindableElement("nonexistent", [rect]);
    expect(result).toBeNull();
  });

  it("finds ellipse elements", () => {
    const el = createTestElement({
      type: "ellipse",
      id: "ellipse1",
      x: 0,
      y: 0,
      width: 80,
      height: 60,
    });
    const result = findBindableElement("ellipse1", [el]);
    expect(result).toBe(el);
  });

  it("finds diamond elements", () => {
    const el = createTestElement({
      type: "diamond",
      id: "diamond1",
      x: 0,
      y: 0,
      width: 80,
      height: 60,
    });
    const result = findBindableElement("diamond1", [el]);
    expect(result).toBe(el);
  });
});
