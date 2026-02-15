import { describe, it, expect } from "vitest";
import { lineHandler } from "../lineHandler";
import { pointFrom } from "../../../../shared/math";
import type { GlobalPoint, LocalPoint, Radians } from "../../../../shared/math";
import type { ExcalidrawLineElement } from "../../../../features/elements/types";
import { isBindableHandler } from "../../../../shared/shapeHandlerRegistry";

function createLineElement(overrides: Partial<ExcalidrawLineElement> = {}): ExcalidrawLineElement {
  return {
    id: "test-line",
    type: "line" as const,
    x: 0,
    y: 0,
    width: 100,
    height: 50,
    angle: 0 as Radians,
    strokeColor: "#1e1e1e",
    backgroundColor: "transparent",
    fillStyle: "hachure" as const,
    strokeWidth: 2,
    strokeStyle: "solid" as const,
    roughness: 1,
    opacity: 100,
    seed: 12_345,
    versionNonce: 67_890,
    version: 0,
    isDeleted: false,
    boundElements: null,
    groupIds: [] as readonly string[],
    index: null,
    frameId: null,
    locked: false,
    updated: 0,
    link: null,
    roundness: null,
    customData: undefined,
    points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 50)] as readonly LocalPoint[],
    lastCommittedPoint: null,
    ...overrides,
  } as unknown as ExcalidrawLineElement;
}

describe("lineHandler", () => {
  it('has type "line"', () => {
    expect(lineHandler.type).toBe("line");
  });

  it("is not a bindable handler", () => {
    expect(isBindableHandler(lineHandler)).toBe(false);
  });
});

describe("hitTest", () => {
  it("returns true for point on line segment", () => {
    const element = createLineElement({
      x: 0,
      y: 0,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 0)] as readonly LocalPoint[],
    });
    const point = pointFrom<GlobalPoint>(50, 0);

    expect(lineHandler.hitTest(point, element, 10)).toBe(true);
  });

  it("returns false for point far from line", () => {
    const element = createLineElement({
      x: 0,
      y: 0,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 0)] as readonly LocalPoint[],
    });
    const point = pointFrom<GlobalPoint>(50, 100);

    expect(lineHandler.hitTest(point, element, 10)).toBe(false);
  });

  it("returns true for point near multi-segment line", () => {
    const element = createLineElement({
      x: 0,
      y: 0,
      points: [
        pointFrom<LocalPoint>(0, 0),
        pointFrom<LocalPoint>(50, 50),
        pointFrom<LocalPoint>(100, 0),
      ] as readonly LocalPoint[],
    });
    const point = pointFrom<GlobalPoint>(50, 50);

    expect(lineHandler.hitTest(point, element, 10)).toBe(true);
  });

  it("accounts for element position offset", () => {
    const element = createLineElement({
      x: 200,
      y: 300,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 0)] as readonly LocalPoint[],
    });
    const point = pointFrom<GlobalPoint>(250, 300);

    expect(lineHandler.hitTest(point, element, 10)).toBe(true);
  });
});

describe("getBounds", () => {
  it("returns bounds from line points", () => {
    const element = createLineElement({
      x: 10,
      y: 20,
      points: [
        pointFrom<LocalPoint>(0, 0),
        pointFrom<LocalPoint>(100, 50),
      ] as readonly LocalPoint[],
    });
    const bounds = lineHandler.getBounds(element);

    expect(bounds).toEqual([10, 20, 110, 70]);
  });

  it("returns bounds enclosing all multi-segment points", () => {
    const element = createLineElement({
      x: 0,
      y: 0,
      points: [
        pointFrom<LocalPoint>(0, 0),
        pointFrom<LocalPoint>(50, -30),
        pointFrom<LocalPoint>(100, 20),
      ] as readonly LocalPoint[],
    });
    const bounds = lineHandler.getBounds(element);

    expect(bounds).toEqual([0, -30, 100, 20]);
  });
});
