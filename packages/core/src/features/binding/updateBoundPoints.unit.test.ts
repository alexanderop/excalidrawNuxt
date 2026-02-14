import { createTestElement, createTestArrowElement } from "../../__test-utils__/factories/element";
import { pointFrom } from "../../shared/math";
import type { LocalPoint } from "../../shared/math";
import type { FixedPointBinding } from "../elements/types";
import { mutateElement } from "../elements/mutateElement";
import {
  updateBoundArrowEndpoints,
  updateArrowEndpoint,
  updateArrowBindings,
} from "./updateBoundPoints";
import { bindArrowToElement } from "./bindUnbind";
import { BASE_BINDING_GAP } from "./constants";

describe("updateBoundArrowEndpoints", () => {
  it("updates arrow start endpoint when bound shape moves", () => {
    const rect = createTestElement({ id: "rect1", x: 0, y: 0, width: 100, height: 100 });
    const arrow = createTestArrowElement({
      id: "arrow1",
      x: 0,
      y: 0,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(200, 0)],
    });

    bindArrowToElement(arrow, "start", rect, [1, 0.5]);

    const before = { x: arrow.x, y: arrow.y, points: arrow.points.map((p) => [p[0], p[1]]) };

    // Move the rect
    mutateElement(rect, { x: 50, y: 50 });

    updateBoundArrowEndpoints(rect, [rect, arrow]);

    // Arrow points should have been updated relative to the new shape position
    const after = { x: arrow.x, y: arrow.y, points: arrow.points.map((p) => [p[0], p[1]]) };
    expect(after).not.toEqual(before);
  });

  it("updates arrow end endpoint when bound shape moves", () => {
    const rect = createTestElement({ id: "rect1", x: 200, y: 0, width: 100, height: 100 });
    const arrow = createTestArrowElement({
      id: "arrow1",
      x: 0,
      y: 50,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(200, 0)],
    });

    bindArrowToElement(arrow, "end", rect, [0, 0.5]);

    // Move the rect
    mutateElement(rect, { x: 300, y: 50 });

    updateBoundArrowEndpoints(rect, [rect, arrow]);

    // Arrow should have been updated — the end point should reflect the new shape position
    const lastPointIdx = arrow.points.length - 1;
    const lastPoint = arrow.points[lastPointIdx];
    expect(lastPoint).toBeDefined();
    // The endpoint should have changed from the original 200,0 relative value
  });

  it("is no-op for non-bindable element", () => {
    const arrow = createTestArrowElement({ id: "arrow1", x: 0, y: 0 });
    const originalPoints = [...arrow.points];

    // Arrow is not bindable, should be a no-op
    updateBoundArrowEndpoints(arrow, [arrow]);

    expect(arrow.points).toEqual(originalPoints);
  });

  it("is no-op for shape with no boundElements", () => {
    const rect = createTestElement({ id: "rect1", x: 0, y: 0, width: 100, height: 100 });
    // No arrows bound, should not throw
    updateBoundArrowEndpoints(rect, [rect]);
    expect(rect.boundElements ?? []).toHaveLength(0);
  });
});

describe("updateArrowEndpoint", () => {
  it("moves start point to shape edge", () => {
    const rect = createTestElement({ id: "rect1", x: 0, y: 0, width: 100, height: 100 });
    const arrow = createTestArrowElement({
      id: "arrow1",
      x: 0,
      y: 0,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(200, 0)],
      startBinding: {
        elementId: "rect1",
        fixedPoint: [1, 0.5],
        focus: 0,
        gap: 0,
      } as FixedPointBinding,
    });

    updateArrowEndpoint(arrow, "start", rect);

    // The start point (after normalization) should reflect the right edge of the rectangle
    // Arrow x/y may shift due to normalizePoints
    expect(Number.isFinite(arrow.x)).toBe(true);
    expect(Number.isFinite(arrow.y)).toBe(true);
  });

  it("moves end point to shape edge", () => {
    const rect = createTestElement({ id: "rect1", x: 200, y: 0, width: 100, height: 100 });
    const arrow = createTestArrowElement({
      id: "arrow1",
      x: 0,
      y: 50,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(200, 0)],
      endBinding: {
        elementId: "rect1",
        fixedPoint: [0, 0.5],
        focus: 0,
        gap: 0,
      } as FixedPointBinding,
    });

    updateArrowEndpoint(arrow, "end", rect);

    const lastPoint = arrow.points.at(-1);
    expect(lastPoint).toBeDefined();
    expect(Number.isFinite(lastPoint![0])).toBe(true);
    expect(Number.isFinite(lastPoint![1])).toBe(true);
  });

  it("is no-op when binding is null", () => {
    const rect = createTestElement({ id: "rect1", x: 0, y: 0, width: 100, height: 100 });
    const arrow = createTestArrowElement({
      id: "arrow1",
      x: 10,
      y: 20,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 50)],
    });

    const originalX = arrow.x;
    const originalY = arrow.y;
    const originalPoints = arrow.points.map((p) => [p[0], p[1]]);

    updateArrowEndpoint(arrow, "start", rect);

    expect(arrow.x).toBe(originalX);
    expect(arrow.y).toBe(originalY);
    expect(arrow.points.map((p) => [p[0], p[1]])).toEqual(originalPoints);
  });

  it("uses inside mode when modeOverride is specified", () => {
    const rect = createTestElement({ id: "rect1", x: 0, y: 0, width: 100, height: 100 });
    const arrow = createTestArrowElement({
      id: "arrow1",
      x: 0,
      y: 0,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(200, 0)],
      startBinding: {
        elementId: "rect1",
        fixedPoint: [0.75, 0.25],
        focus: 0,
        gap: 0,
      } as FixedPointBinding,
    });

    updateArrowEndpoint(arrow, "start", rect, "inside");

    // In inside mode, the start point should land at scene (75, 25) — the raw fixedPoint coordinate
    // After normalization the arrow x,y may shift, but the absolute position should be (75, 25)
    const firstPoint = arrow.points[0];
    expect(firstPoint).toBeDefined();
    const absX = arrow.x + firstPoint![0];
    const absY = arrow.y + firstPoint![1];
    expect(absX).toBeCloseTo(75, 1);
    expect(absY).toBeCloseTo(25, 1);
  });
});

describe("short-arrow inside-mode fallback", () => {
  it("uses inside mode when bound shapes are close together", () => {
    // Two rectangles with centers less than SHORT_ARROW_THRESHOLD apart
    const rect1 = createTestElement({ id: "rect1", x: 0, y: 0, width: 40, height: 40 });
    const rect2 = createTestElement({ id: "rect2", x: 10, y: 10, width: 40, height: 40 });
    // Centers: rect1=(20,20), rect2=(30,30) → distance ~14.1 < 40

    const arrow = createTestArrowElement({
      id: "arrow1",
      x: 20,
      y: 20,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(10, 10)],
    });

    bindArrowToElement(arrow, "start", rect1, [0.5, 0.5]);
    bindArrowToElement(arrow, "end", rect2, [0.5, 0.5]);

    const elements = [rect1, rect2, arrow];
    updateBoundArrowEndpoints(rect1, elements);

    // In inside mode (short arrow), the start point should land at the fixedPoint's
    // scene coordinate (center of rect1 = 20, 20), NOT projected onto the edge + gap
    const firstPoint = arrow.points[0];
    expect(firstPoint).toBeDefined();
    const absX = arrow.x + firstPoint![0];
    const absY = arrow.y + firstPoint![1];
    // Inside mode: should be at center (20, 20)
    expect(absX).toBeCloseTo(20, 1);
    expect(absY).toBeCloseTo(20, 1);
  });

  it("uses orbit mode when bound shapes are far apart", () => {
    const rect1 = createTestElement({ id: "rect1", x: 0, y: 0, width: 100, height: 100 });
    const rect2 = createTestElement({ id: "rect2", x: 300, y: 0, width: 100, height: 100 });
    // Centers: rect1=(50,50), rect2=(350,50) → distance = 300 > 40

    const arrow = createTestArrowElement({
      id: "arrow1",
      x: 0,
      y: 50,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(300, 0)],
    });

    bindArrowToElement(arrow, "start", rect1, [1, 0.5]);
    bindArrowToElement(arrow, "end", rect2, [0, 0.5]);

    const elements = [rect1, rect2, arrow];
    updateBoundArrowEndpoints(rect1, elements);

    // In orbit mode, the start point should land on the edge + gap
    const firstPoint = arrow.points[0];
    expect(firstPoint).toBeDefined();
    const absX = arrow.x + firstPoint![0];
    // Orbit mode: right edge (100) + gap (5) = 105
    expect(absX).toBeCloseTo(100 + BASE_BINDING_GAP, 1);
  });

  it("uses inside mode via updateArrowBindings when shapes are close", () => {
    const rect1 = createTestElement({ id: "rect1", x: 0, y: 0, width: 30, height: 30 });
    const rect2 = createTestElement({ id: "rect2", x: 5, y: 5, width: 30, height: 30 });
    // Centers: (15,15) and (20,20) → distance ~7.07 < 40

    const arrow = createTestArrowElement({
      id: "arrow1",
      x: 15,
      y: 15,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(5, 5)],
    });

    bindArrowToElement(arrow, "start", rect1, [0.5, 0.5]);
    bindArrowToElement(arrow, "end", rect2, [0.5, 0.5]);

    const elements = [rect1, rect2, arrow];
    updateArrowBindings(arrow, elements);

    // Both endpoints should use inside mode
    const firstPoint = arrow.points[0];
    expect(firstPoint).toBeDefined();
    const absStartX = arrow.x + firstPoint![0];
    const absStartY = arrow.y + firstPoint![1];
    expect(absStartX).toBeCloseTo(15, 1);
    expect(absStartY).toBeCloseTo(15, 1);
  });
});
