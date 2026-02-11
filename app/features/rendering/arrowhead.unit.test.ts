import { createCanvasContextMock } from "~/__test-utils__/mocks/canvasContextMock";
import { createTestArrowElement } from "~/__test-utils__/factories/element";
import { pointFrom } from "~/shared/math";
import type { LocalPoint } from "~/shared/math";
import { renderArrowheads } from "./arrowhead";

describe("renderArrowheads", () => {
  it("draws arrow arrowhead (triangle shape via moveTo/lineTo)", () => {
    const { ctx, getCallsFor } = createCanvasContextMock();
    const arrow = createTestArrowElement({
      endArrowhead: "arrow",
      startArrowhead: null,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 50)],
      strokeWidth: 2,
    });

    renderArrowheads(ctx, arrow, "light");

    const moveToCalls = getCallsFor("moveTo");
    const lineToCalls = getCallsFor("lineTo");
    expect(moveToCalls.length).toBeGreaterThanOrEqual(1);
    expect(lineToCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("draws triangle arrowhead style", () => {
    const { ctx, getCallsFor } = createCanvasContextMock();
    const arrow = createTestArrowElement({
      endArrowhead: "triangle",
      startArrowhead: null,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 50)],
      strokeWidth: 2,
    });

    renderArrowheads(ctx, arrow, "light");

    // Triangle style calls closePath and fill in addition to moveTo/lineTo
    const closePathCalls = getCallsFor("closePath");
    const fillCalls = getCallsFor("fill");
    expect(closePathCalls.length).toBeGreaterThanOrEqual(1);
    expect(fillCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("handles start arrowhead position", () => {
    const { ctx, getCallsFor } = createCanvasContextMock();
    const arrow = createTestArrowElement({
      endArrowhead: null,
      startArrowhead: "arrow",
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 50)],
      strokeWidth: 2,
    });

    renderArrowheads(ctx, arrow, "light");

    // Start arrowhead should draw towards points[0] from points[1]
    const moveToCalls = getCallsFor("moveTo");
    const lineToCalls = getCallsFor("lineTo");
    expect(moveToCalls.length).toBeGreaterThanOrEqual(1);
    expect(lineToCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("handles end arrowhead position", () => {
    const { ctx, getCallsFor } = createCanvasContextMock();
    const arrow = createTestArrowElement({
      endArrowhead: "arrow",
      startArrowhead: null,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 50)],
      strokeWidth: 2,
    });

    renderArrowheads(ctx, arrow, "light");

    // The lineTo tip should target the last point (100, 50)
    const lineToCalls = getCallsFor("lineTo");
    const tipCall = lineToCalls.find((c) => c.args[0] === 100 && c.args[1] === 50);
    expect(tipCall).toBeDefined();
  });

  it("scales with stroke width", () => {
    const { ctx: ctx1, getCallsFor: getCallsFor1 } = createCanvasContextMock();
    const { ctx: ctx2, getCallsFor: getCallsFor2 } = createCanvasContextMock();

    const thinArrow = createTestArrowElement({
      endArrowhead: "arrow",
      startArrowhead: null,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 0)],
      strokeWidth: 1,
    });
    const thickArrow = createTestArrowElement({
      endArrowhead: "arrow",
      startArrowhead: null,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 0)],
      strokeWidth: 5,
    });

    renderArrowheads(ctx1, thinArrow, "light");
    renderArrowheads(ctx2, thickArrow, "light");

    // lineWidth is set to strokeWidth
    const lineWidth1 = getCallsFor1("set:lineWidth");
    const lineWidth2 = getCallsFor2("set:lineWidth");
    expect(lineWidth1.some((c) => c.args[0] === 1)).toBe(true);
    expect(lineWidth2.some((c) => c.args[0] === 5)).toBe(true);
  });

  it("handles null arrowhead (no drawing)", () => {
    const { ctx, calls } = createCanvasContextMock();
    const arrow = createTestArrowElement({
      endArrowhead: null,
      startArrowhead: null,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 50)],
      strokeWidth: 2,
    });

    renderArrowheads(ctx, arrow, "light");

    // No drawing calls should happen - no beginPath, no moveTo, no lineTo
    const beginPathCalls = calls.filter((c) => c.method === "beginPath");
    const moveToCalls = calls.filter((c) => c.method === "moveTo");
    expect(beginPathCalls).toHaveLength(0);
    expect(moveToCalls).toHaveLength(0);
  });

  it("closePath called for filled arrowheads", () => {
    const { ctx, getCallsFor } = createCanvasContextMock();
    const arrow = createTestArrowElement({
      endArrowhead: "triangle",
      startArrowhead: "triangle",
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 50)],
      strokeWidth: 2,
    });

    renderArrowheads(ctx, arrow, "light");

    // Both triangle arrowheads should call closePath
    const closePathCalls = getCallsFor("closePath");
    expect(closePathCalls).toHaveLength(2);
  });

  it("stroke/fill calls present for each arrowhead drawn", () => {
    const { ctx, getCallsFor } = createCanvasContextMock();
    const arrow = createTestArrowElement({
      endArrowhead: "triangle",
      startArrowhead: "arrow",
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 50)],
      strokeWidth: 2,
    });

    renderArrowheads(ctx, arrow, "light");

    // Both arrowheads call stroke; triangle also calls fill
    const strokeCalls = getCallsFor("stroke");
    const fillCalls = getCallsFor("fill");
    expect(strokeCalls).toHaveLength(2); // one per arrowhead
    expect(fillCalls).toHaveLength(1); // only triangle calls fill
  });
});
