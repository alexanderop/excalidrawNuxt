import { createCanvasContextMock } from "~/__test-utils__/mocks/canvasContextMock";
import { createTestArrowElement } from "~/__test-utils__/factories/element";
import { pointFrom } from "~/shared/math";
import type { GlobalPoint, LocalPoint } from "~/shared/math";
import {
  renderRubberBand,
  renderPointHandles,
  renderMidpointIndicator,
} from "./renderLinearEditor";

function createThreePointArrow() {
  return createTestArrowElement({
    id: "arrow-1",
    x: 10,
    y: 20,
    points: [
      pointFrom<LocalPoint>(0, 0),
      pointFrom<LocalPoint>(100, 50),
      pointFrom<LocalPoint>(200, 0),
    ],
  });
}

describe("renderRubberBand", () => {
  it("draws a line (moveTo + lineTo calls)", () => {
    const { ctx, getCallsFor } = createCanvasContextMock();
    const arrow = createTestArrowElement({
      x: 10,
      y: 20,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 50)],
    });
    const cursorPoint = pointFrom<GlobalPoint>(200, 150);

    renderRubberBand(ctx, arrow, cursorPoint, 1, "light");

    const moveToCalls = getCallsFor("moveTo");
    const lineToCalls = getCallsFor("lineTo");
    expect(moveToCalls).toHaveLength(1);
    expect(lineToCalls).toHaveLength(1);
    // moveTo should be the last point in scene space: (100 + 10, 50 + 20)
    expect(moveToCalls[0]!.args).toEqual([110, 70]);
    // lineTo should be the cursor point
    expect(lineToCalls[0]!.args).toEqual([200, 150]);
  });

  it("sets dashed line style (setLineDash called)", () => {
    const { ctx, getCallsFor } = createCanvasContextMock();
    const arrow = createTestArrowElement({
      x: 0,
      y: 0,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 50)],
    });
    const cursorPoint = pointFrom<GlobalPoint>(200, 150);

    renderRubberBand(ctx, arrow, cursorPoint, 1, "light");

    const setLineDashCalls = getCallsFor("setLineDash");
    expect(setLineDashCalls.length).toBeGreaterThanOrEqual(1);
    // RUBBER_BAND_DASH is [4, 4], at zoom 1 it stays [4, 4]
    expect(setLineDashCalls[0]!.args[0]).toEqual([4, 4]);
  });

  it("saves and restores context", () => {
    const { ctx, getCallsFor } = createCanvasContextMock();
    const arrow = createTestArrowElement({
      x: 0,
      y: 0,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 50)],
    });
    const cursorPoint = pointFrom<GlobalPoint>(200, 150);

    renderRubberBand(ctx, arrow, cursorPoint, 1, "light");

    expect(getCallsFor("save")).toHaveLength(1);
    expect(getCallsFor("restore")).toHaveLength(1);
  });
});

describe("renderPointHandles", () => {
  it("draws circles for each point (arc calls)", () => {
    const { ctx, getCallsFor } = createCanvasContextMock();
    const arrow = createThreePointArrow();
    const selectedIndices = new Set<number>();

    renderPointHandles(ctx, arrow, selectedIndices, 1, "light");

    // 3 points = 3 arc calls
    const arcCalls = getCallsFor("arc");
    expect(arcCalls).toHaveLength(3);
  });

  it("uses different fill for selected vs unselected points", () => {
    const { ctx, calls } = createCanvasContextMock();
    const arrow = createThreePointArrow();
    const selectedIndices = new Set([0]); // first point selected

    renderPointHandles(ctx, arrow, selectedIndices, 1, "light");

    // Look at fillStyle set calls - should see both selected and unselected fills
    const fillStyleSets = calls.filter((c) => c.method === "set:fillStyle");
    const fillValues = fillStyleSets.map((c) => c.args[0]);
    // Selected fill (#4a90d9) and unselected fill (#ffffff) should both appear
    const uniqueFills = [...new Set(fillValues)];
    expect(uniqueFills.length).toBeGreaterThanOrEqual(2);
  });

  it("saves and restores context", () => {
    const { ctx, getCallsFor } = createCanvasContextMock();
    const arrow = createThreePointArrow();
    const selectedIndices = new Set<number>();

    renderPointHandles(ctx, arrow, selectedIndices, 1, "light");

    expect(getCallsFor("save")).toHaveLength(1);
    expect(getCallsFor("restore")).toHaveLength(1);
  });
});

describe("renderMidpointIndicator", () => {
  it("draws a circle (arc call)", () => {
    const { ctx, getCallsFor } = createCanvasContextMock();
    const arrow = createThreePointArrow();

    // hoveredSegmentIndex 0 = midpoint between point 0 and point 1
    renderMidpointIndicator(ctx, arrow, 0, 1, "light");

    const arcCalls = getCallsFor("arc");
    expect(arcCalls).toHaveLength(1);
  });

  it("does nothing for invalid segment index", () => {
    const { ctx, calls } = createCanvasContextMock();
    const arrow = createThreePointArrow();

    // Index 99 is out of range — no midpoint exists there
    renderMidpointIndicator(ctx, arrow, 99, 1, "light");

    // Should return early without drawing anything
    const arcCalls = calls.filter((c) => c.method === "arc");
    expect(arcCalls).toHaveLength(0);
  });
});
