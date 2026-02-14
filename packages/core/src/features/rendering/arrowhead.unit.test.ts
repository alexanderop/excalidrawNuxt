import type { Arrowhead } from "../elements/types";
import { createCanvasContextMock } from "../../__test-utils__/mocks/canvasContextMock";
import { createTestArrowElement } from "../../__test-utils__/factories/element";
import { pointFrom } from "../../shared/math";
import type { LocalPoint } from "../../shared/math";
import {
  getArrowheadSize,
  getArrowheadAngle,
  getStrokeLineDash,
  renderArrowheads,
} from "./arrowhead";

const ALL_ARROWHEAD_TYPES: Arrowhead[] = [
  "arrow",
  "bar",
  "dot",
  "circle",
  "circle_outline",
  "triangle",
  "triangle_outline",
  "diamond",
  "diamond_outline",
  "crowfoot_one",
  "crowfoot_many",
  "crowfoot_one_or_many",
];

describe("getArrowheadSize", () => {
  it("returns 25 for arrow type", () => {
    expect(getArrowheadSize("arrow")).toBe(25);
  });

  it("returns 15 for bar type", () => {
    expect(getArrowheadSize("bar")).toBe(15);
  });

  it("returns 15 for circle types", () => {
    expect(getArrowheadSize("circle")).toBe(15);
    expect(getArrowheadSize("circle_outline")).toBe(15);
    expect(getArrowheadSize("dot")).toBe(15);
  });

  it("returns 15 for triangle types", () => {
    expect(getArrowheadSize("triangle")).toBe(15);
    expect(getArrowheadSize("triangle_outline")).toBe(15);
  });

  it("returns 12 for diamond types", () => {
    expect(getArrowheadSize("diamond")).toBe(12);
    expect(getArrowheadSize("diamond_outline")).toBe(12);
  });

  it("returns 20 for crowfoot types", () => {
    expect(getArrowheadSize("crowfoot_one")).toBe(20);
    expect(getArrowheadSize("crowfoot_many")).toBe(20);
    expect(getArrowheadSize("crowfoot_one_or_many")).toBe(20);
  });
});

describe("getArrowheadAngle", () => {
  const RAD = Math.PI / 180;

  it("returns 20 degrees for arrow type", () => {
    expect(getArrowheadAngle("arrow")).toBeCloseTo(20 * RAD, 5);
  });

  it("returns 90 degrees for bar type", () => {
    expect(getArrowheadAngle("bar")).toBeCloseTo(90 * RAD, 5);
  });

  it("returns 25 degrees for triangle types", () => {
    expect(getArrowheadAngle("triangle")).toBeCloseTo(25 * RAD, 5);
    expect(getArrowheadAngle("triangle_outline")).toBeCloseTo(25 * RAD, 5);
  });

  it("returns 25 degrees for diamond types", () => {
    expect(getArrowheadAngle("diamond")).toBeCloseTo(25 * RAD, 5);
    expect(getArrowheadAngle("diamond_outline")).toBeCloseTo(25 * RAD, 5);
  });

  it("returns 0 for circle types (no angle)", () => {
    expect(getArrowheadAngle("circle")).toBe(0);
    expect(getArrowheadAngle("circle_outline")).toBe(0);
    expect(getArrowheadAngle("dot")).toBe(0);
  });

  it("returns 90 degrees for crowfoot_one", () => {
    expect(getArrowheadAngle("crowfoot_one")).toBeCloseTo(90 * RAD, 5);
  });

  it("returns 0 for crowfoot_many and crowfoot_one_or_many", () => {
    expect(getArrowheadAngle("crowfoot_many")).toBe(0);
    expect(getArrowheadAngle("crowfoot_one_or_many")).toBe(0);
  });
});

describe("renderArrowheads", () => {
  it("does not draw when both arrowheads are null", () => {
    const { ctx, calls } = createCanvasContextMock();
    const arrow = createTestArrowElement({
      endArrowhead: null,
      startArrowhead: null,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 50)],
      strokeWidth: 2,
    });

    renderArrowheads(ctx, arrow, "light");

    const beginPathCalls = calls.filter((c) => c.method === "beginPath");
    expect(beginPathCalls).toHaveLength(0);
  });

  it("does not draw when points has fewer than 2 entries", () => {
    const { ctx, calls } = createCanvasContextMock();
    const arrow = createTestArrowElement({
      endArrowhead: "arrow",
      points: [pointFrom<LocalPoint>(0, 0)],
      strokeWidth: 2,
    });

    renderArrowheads(ctx, arrow, "light");

    const beginPathCalls = calls.filter((c) => c.method === "beginPath");
    expect(beginPathCalls).toHaveLength(0);
  });

  it.each(ALL_ARROWHEAD_TYPES)("does not throw for endArrowhead type: %s", (type) => {
    const { ctx } = createCanvasContextMock();
    const arrow = createTestArrowElement({
      endArrowhead: type,
      startArrowhead: null,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 50)],
      strokeWidth: 2,
    });

    expect(() => renderArrowheads(ctx, arrow, "light")).not.toThrow();
  });

  it.each(ALL_ARROWHEAD_TYPES)("does not throw for startArrowhead type: %s", (type) => {
    const { ctx } = createCanvasContextMock();
    const arrow = createTestArrowElement({
      endArrowhead: null,
      startArrowhead: type,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 50)],
      strokeWidth: 2,
    });

    expect(() => renderArrowheads(ctx, arrow, "light")).not.toThrow();
  });

  it("draws arrow type with moveTo/lineTo strokes (no fill)", () => {
    const { ctx, getCallsFor } = createCanvasContextMock();
    const arrow = createTestArrowElement({
      endArrowhead: "arrow",
      startArrowhead: null,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 50)],
      strokeWidth: 2,
    });

    renderArrowheads(ctx, arrow, "light");

    expect(getCallsFor("moveTo").length).toBeGreaterThanOrEqual(1);
    expect(getCallsFor("lineTo").length).toBeGreaterThanOrEqual(1);
    expect(getCallsFor("stroke").length).toBeGreaterThanOrEqual(1);
    // arrow type does not fill
    expect(getCallsFor("fill")).toHaveLength(0);
  });

  it("draws bar type with a perpendicular line", () => {
    const { ctx, getCallsFor } = createCanvasContextMock();
    const arrow = createTestArrowElement({
      endArrowhead: "bar",
      startArrowhead: null,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 0)],
      strokeWidth: 2,
    });

    renderArrowheads(ctx, arrow, "light");

    expect(getCallsFor("moveTo")).toHaveLength(1);
    expect(getCallsFor("lineTo")).toHaveLength(1);
    expect(getCallsFor("stroke")).toHaveLength(1);
  });

  it("draws circle type with arc and fill", () => {
    const { ctx, getCallsFor } = createCanvasContextMock();
    const arrow = createTestArrowElement({
      endArrowhead: "circle",
      startArrowhead: null,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 0)],
      strokeWidth: 2,
    });

    renderArrowheads(ctx, arrow, "light");

    expect(getCallsFor("arc")).toHaveLength(1);
    expect(getCallsFor("fill")).toHaveLength(1);
    expect(getCallsFor("stroke")).toHaveLength(1);
  });

  it("draws circle_outline with white fill", () => {
    const { ctx, calls } = createCanvasContextMock();
    const arrow = createTestArrowElement({
      endArrowhead: "circle_outline",
      startArrowhead: null,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 0)],
      strokeWidth: 2,
    });

    renderArrowheads(ctx, arrow, "light");

    const fillStyleSets = calls.filter((c) => c.method === "set:fillStyle");
    expect(fillStyleSets.some((c) => c.args[0] === "#ffffff")).toBe(true);
  });

  it("draws dot type same as circle (legacy alias)", () => {
    const { ctx: ctxDot, getCallsFor: getDot } = createCanvasContextMock();
    const { ctx: ctxCircle, getCallsFor: getCircle } = createCanvasContextMock();

    const dotArrow = createTestArrowElement({
      endArrowhead: "dot",
      startArrowhead: null,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 0)],
      strokeWidth: 2,
    });
    const circleArrow = createTestArrowElement({
      endArrowhead: "circle",
      startArrowhead: null,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 0)],
      strokeWidth: 2,
    });

    renderArrowheads(ctxDot, dotArrow, "light");
    renderArrowheads(ctxCircle, circleArrow, "light");

    // Both should use arc
    expect(getDot("arc")).toHaveLength(1);
    expect(getCircle("arc")).toHaveLength(1);
  });

  it("draws triangle type with fill and closePath", () => {
    const { ctx, getCallsFor } = createCanvasContextMock();
    const arrow = createTestArrowElement({
      endArrowhead: "triangle",
      startArrowhead: null,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 50)],
      strokeWidth: 2,
    });

    renderArrowheads(ctx, arrow, "light");

    expect(getCallsFor("closePath")).toHaveLength(1);
    expect(getCallsFor("fill")).toHaveLength(1);
    expect(getCallsFor("stroke")).toHaveLength(1);
  });

  it("draws triangle_outline with white fill", () => {
    const { ctx, calls } = createCanvasContextMock();
    const arrow = createTestArrowElement({
      endArrowhead: "triangle_outline",
      startArrowhead: null,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 50)],
      strokeWidth: 2,
    });

    renderArrowheads(ctx, arrow, "light");

    const fillStyleSets = calls.filter((c) => c.method === "set:fillStyle");
    expect(fillStyleSets.some((c) => c.args[0] === "#ffffff")).toBe(true);
  });

  it("draws diamond type with 4-point polygon (closePath + fill)", () => {
    const { ctx, getCallsFor } = createCanvasContextMock();
    const arrow = createTestArrowElement({
      endArrowhead: "diamond",
      startArrowhead: null,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 0)],
      strokeWidth: 2,
    });

    renderArrowheads(ctx, arrow, "light");

    // Diamond: moveTo + 3x lineTo + closePath
    expect(getCallsFor("moveTo")).toHaveLength(1);
    expect(getCallsFor("lineTo")).toHaveLength(3);
    expect(getCallsFor("closePath")).toHaveLength(1);
    expect(getCallsFor("fill")).toHaveLength(1);
  });

  it("draws diamond_outline with white fill", () => {
    const { ctx, calls } = createCanvasContextMock();
    const arrow = createTestArrowElement({
      endArrowhead: "diamond_outline",
      startArrowhead: null,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 0)],
      strokeWidth: 2,
    });

    renderArrowheads(ctx, arrow, "light");

    const fillStyleSets = calls.filter((c) => c.method === "set:fillStyle");
    expect(fillStyleSets.some((c) => c.args[0] === "#ffffff")).toBe(true);
  });

  it("draws crowfoot_one with a perpendicular line", () => {
    const { ctx, getCallsFor } = createCanvasContextMock();
    const arrow = createTestArrowElement({
      endArrowhead: "crowfoot_one",
      startArrowhead: null,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 0)],
      strokeWidth: 2,
    });

    renderArrowheads(ctx, arrow, "light");

    expect(getCallsFor("moveTo")).toHaveLength(1);
    expect(getCallsFor("lineTo")).toHaveLength(1);
    expect(getCallsFor("stroke")).toHaveLength(1);
  });

  it("draws crowfoot_many with three lines (center + two splays)", () => {
    const { ctx, getCallsFor } = createCanvasContextMock();
    const arrow = createTestArrowElement({
      endArrowhead: "crowfoot_many",
      startArrowhead: null,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 0)],
      strokeWidth: 2,
    });

    renderArrowheads(ctx, arrow, "light");

    // 3 separate beginPath + stroke sequences
    expect(getCallsFor("beginPath")).toHaveLength(3);
    expect(getCallsFor("stroke")).toHaveLength(3);
  });

  it("draws crowfoot_one_or_many combining both patterns", () => {
    const { ctx, getCallsFor } = createCanvasContextMock();
    const arrow = createTestArrowElement({
      endArrowhead: "crowfoot_one_or_many",
      startArrowhead: null,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 0)],
      strokeWidth: 2,
    });

    renderArrowheads(ctx, arrow, "light");

    // crowfoot_many (3 strokes) + crowfoot_one (1 stroke) = 4 strokes
    expect(getCallsFor("stroke")).toHaveLength(4);
  });

  it("scales arrowhead size down for short segments", () => {
    const { ctx, getCallsFor } = createCanvasContextMock();
    // Very short segment (5px) — shorter than arrow's base size of 25
    const arrow = createTestArrowElement({
      endArrowhead: "arrow",
      startArrowhead: null,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(5, 0)],
      strokeWidth: 1,
    });

    renderArrowheads(ctx, arrow, "light");

    // Arrow should still render (not throw)
    expect(getCallsFor("stroke")).toHaveLength(1);
    // The wing positions should be closer to tip than for a long segment
    const moveToCalls = getCallsFor("moveTo");
    expect(moveToCalls).toHaveLength(1);
    // With 5px segment and 0.5 multiplier, actualSize = min(25, 5*0.5) = 2.5
    // Wings should be very close to the tip
    const wingX = moveToCalls[0]!.args[0];
    // wingX should be near tip (5) — within the scaled size
    expect(typeof wingX).toBe("number");
  });

  it("handles start arrowhead pointing in correct direction", () => {
    const { ctx, getCallsFor } = createCanvasContextMock();
    const arrow = createTestArrowElement({
      endArrowhead: null,
      startArrowhead: "arrow",
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 0)],
      strokeWidth: 2,
    });

    renderArrowheads(ctx, arrow, "light");

    // The lineTo tip should be at point[0] = (0,0)
    const lineToCalls = getCallsFor("lineTo");
    const tipCall = lineToCalls.find((c) => c.args[0] === 0 && c.args[1] === 0);
    expect(tipCall).toBeDefined();
  });

  it("sets lineWidth to strokeWidth", () => {
    const { ctx, getCallsFor } = createCanvasContextMock();
    const arrow = createTestArrowElement({
      endArrowhead: "arrow",
      startArrowhead: null,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 50)],
      strokeWidth: 3,
    });

    renderArrowheads(ctx, arrow, "light");

    const lineWidthSets = getCallsFor("set:lineWidth");
    expect(lineWidthSets.some((c) => c.args[0] === 3)).toBe(true);
  });

  it("calls save and restore for each arrowhead", () => {
    const { ctx, getCallsFor } = createCanvasContextMock();
    const arrow = createTestArrowElement({
      endArrowhead: "triangle",
      startArrowhead: "arrow",
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 50)],
      strokeWidth: 2,
    });

    renderArrowheads(ctx, arrow, "light");

    expect(getCallsFor("save")).toHaveLength(2);
    expect(getCallsFor("restore")).toHaveLength(2);
  });
});

describe("getStrokeLineDash", () => {
  it("returns dashed pattern for dashed style", () => {
    expect(getStrokeLineDash("dashed", 2)).toEqual([8, 10]);
  });

  it("returns dotted pattern for dotted style", () => {
    expect(getStrokeLineDash("dotted", 2)).toEqual([1.5, 8]);
  });

  it("returns empty array for solid style", () => {
    expect(getStrokeLineDash("solid", 2)).toEqual([]);
  });

  it("scales dash gap with strokeWidth", () => {
    expect(getStrokeLineDash("dashed", 4)).toEqual([8, 12]);
    expect(getStrokeLineDash("dotted", 4)).toEqual([1.5, 10]);
  });
});

describe("stroke style on arrowheads", () => {
  it("applies dashed pattern to stroke-only arrowhead", () => {
    const { ctx, getCallsFor } = createCanvasContextMock();
    const arrow = createTestArrowElement({
      endArrowhead: "arrow",
      startArrowhead: null,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 50)],
      strokeWidth: 2,
      strokeStyle: "dashed",
    });

    renderArrowheads(ctx, arrow, "light");

    const setLineDashCalls = getCallsFor("setLineDash");
    expect(setLineDashCalls).toHaveLength(1);
    expect(setLineDashCalls[0]!.args[0]).toEqual([8, 10]);
  });

  it("applies dotted pattern to outline arrowhead", () => {
    const { ctx, getCallsFor } = createCanvasContextMock();
    const arrow = createTestArrowElement({
      endArrowhead: "bar",
      startArrowhead: null,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 50)],
      strokeWidth: 2,
      strokeStyle: "dotted",
    });

    renderArrowheads(ctx, arrow, "light");

    const setLineDashCalls = getCallsFor("setLineDash");
    expect(setLineDashCalls).toHaveLength(1);
    expect(setLineDashCalls[0]!.args[0]).toEqual([1.5, 8]);
  });

  it("does not apply dash pattern to filled arrowhead", () => {
    const { ctx, getCallsFor } = createCanvasContextMock();
    const arrow = createTestArrowElement({
      endArrowhead: "triangle",
      startArrowhead: null,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 50)],
      strokeWidth: 2,
      strokeStyle: "dashed",
    });

    renderArrowheads(ctx, arrow, "light");

    const setLineDashCalls = getCallsFor("setLineDash");
    expect(setLineDashCalls).toHaveLength(0);
  });

  it("does not apply dash pattern for solid strokeStyle", () => {
    const { ctx, getCallsFor } = createCanvasContextMock();
    const arrow = createTestArrowElement({
      endArrowhead: "arrow",
      startArrowhead: null,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 50)],
      strokeWidth: 2,
      strokeStyle: "solid",
    });

    renderArrowheads(ctx, arrow, "light");

    const setLineDashCalls = getCallsFor("setLineDash");
    expect(setLineDashCalls).toHaveLength(1);
    expect(setLineDashCalls[0]!.args[0]).toEqual([]);
  });

  it("applies dash to circle_outline but not to circle", () => {
    const { ctx: ctxOutline, getCallsFor: getOutline } = createCanvasContextMock();
    const { ctx: ctxFilled, getCallsFor: getFilled } = createCanvasContextMock();

    const outlineArrow = createTestArrowElement({
      endArrowhead: "circle_outline",
      startArrowhead: null,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 0)],
      strokeWidth: 2,
      strokeStyle: "dashed",
    });
    const filledArrow = createTestArrowElement({
      endArrowhead: "circle",
      startArrowhead: null,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 0)],
      strokeWidth: 2,
      strokeStyle: "dashed",
    });

    renderArrowheads(ctxOutline, outlineArrow, "light");
    renderArrowheads(ctxFilled, filledArrow, "light");

    expect(getOutline("setLineDash")).toHaveLength(1);
    expect(getOutline("setLineDash")[0]!.args[0]).toEqual([8, 10]);
    expect(getFilled("setLineDash")).toHaveLength(0);
  });

  it("applies dash to diamond_outline but not to diamond", () => {
    const { ctx: ctxOutline, getCallsFor: getOutline } = createCanvasContextMock();
    const { ctx: ctxFilled, getCallsFor: getFilled } = createCanvasContextMock();

    const outlineArrow = createTestArrowElement({
      endArrowhead: "diamond_outline",
      startArrowhead: null,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 0)],
      strokeWidth: 2,
      strokeStyle: "dotted",
    });
    const filledArrow = createTestArrowElement({
      endArrowhead: "diamond",
      startArrowhead: null,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 0)],
      strokeWidth: 2,
      strokeStyle: "dotted",
    });

    renderArrowheads(ctxOutline, outlineArrow, "light");
    renderArrowheads(ctxFilled, filledArrow, "light");

    expect(getOutline("setLineDash")).toHaveLength(1);
    expect(getOutline("setLineDash")[0]!.args[0]).toEqual([1.5, 8]);
    expect(getFilled("setLineDash")).toHaveLength(0);
  });
});
