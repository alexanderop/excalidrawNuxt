import { describe, it, expect } from "vitest";
import { freeDrawHandler } from "../freeDrawHandler";
import { pointFrom } from "../../../../shared/math";
import type { GlobalPoint, LocalPoint, Radians } from "../../../../shared/math";
import type { ExcalidrawFreeDrawElement } from "../../../../features/elements/types";
import { isBindableHandler } from "../../../../shared/shapeHandlerRegistry";

function createFreeDrawElement(
  overrides: Partial<ExcalidrawFreeDrawElement> = {},
): ExcalidrawFreeDrawElement {
  return {
    id: "test-freedraw",
    type: "freedraw" as const,
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
    points: [
      pointFrom<LocalPoint>(0, 0),
      pointFrom<LocalPoint>(50, 25),
      pointFrom<LocalPoint>(100, 50),
    ] as readonly LocalPoint[],
    pressures: [0.5, 0.5, 0.5],
    simulatePressure: false,
    lastCommittedPoint: null,
    ...overrides,
  } as unknown as ExcalidrawFreeDrawElement;
}

describe("freeDrawHandler", () => {
  it('has type "freedraw"', () => {
    expect(freeDrawHandler.type).toBe("freedraw");
  });

  it("is not a bindable handler", () => {
    expect(isBindableHandler(freeDrawHandler)).toBe(false);
  });
});

describe("hitTest", () => {
  it("returns true for point on freedraw stroke", () => {
    const element = createFreeDrawElement({
      x: 0,
      y: 0,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 0)] as readonly LocalPoint[],
    });
    const point = pointFrom<GlobalPoint>(50, 0);

    expect(freeDrawHandler.hitTest(point, element, 10)).toBe(true);
  });

  it("returns false for point far from stroke", () => {
    const element = createFreeDrawElement({
      x: 0,
      y: 0,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 0)] as readonly LocalPoint[],
    });
    const point = pointFrom<GlobalPoint>(50, 100);

    expect(freeDrawHandler.hitTest(point, element, 10)).toBe(false);
  });

  it("returns true for point near multi-point stroke path", () => {
    const element = createFreeDrawElement({
      x: 0,
      y: 0,
      points: [
        pointFrom<LocalPoint>(0, 0),
        pointFrom<LocalPoint>(50, 50),
        pointFrom<LocalPoint>(100, 0),
      ] as readonly LocalPoint[],
    });
    const point = pointFrom<GlobalPoint>(50, 50);

    expect(freeDrawHandler.hitTest(point, element, 10)).toBe(true);
  });

  it("accounts for element position offset", () => {
    const element = createFreeDrawElement({
      x: 100,
      y: 200,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(50, 0)] as readonly LocalPoint[],
    });
    const point = pointFrom<GlobalPoint>(125, 200);

    expect(freeDrawHandler.hitTest(point, element, 10)).toBe(true);
  });
});

describe("getBounds", () => {
  it("returns bounds from freedraw points", () => {
    const element = createFreeDrawElement({
      x: 10,
      y: 20,
      points: [
        pointFrom<LocalPoint>(0, 0),
        pointFrom<LocalPoint>(50, 25),
        pointFrom<LocalPoint>(100, 50),
      ] as readonly LocalPoint[],
    });
    const bounds = freeDrawHandler.getBounds(element);

    expect(bounds).toEqual([10, 20, 110, 70]);
  });

  it("returns bounds enclosing negative offset points", () => {
    const element = createFreeDrawElement({
      x: 0,
      y: 0,
      points: [
        pointFrom<LocalPoint>(0, 0),
        pointFrom<LocalPoint>(50, -30),
        pointFrom<LocalPoint>(100, 20),
      ] as readonly LocalPoint[],
    });
    const bounds = freeDrawHandler.getBounds(element);

    expect(bounds).toEqual([0, -30, 100, 20]);
  });
});
