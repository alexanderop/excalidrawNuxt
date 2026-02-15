import { createCanvasContextMock } from "../../__test-utils__/mocks/canvasContextMock";
import { createTestElement, createTestArrowElement } from "../../__test-utils__/factories/element";
import { pointFrom } from "../../shared/math";
import type { GlobalPoint, LocalPoint } from "../../shared/math";
import { renderInteractiveScene } from "./renderInteractive";
import type { LinearEditorRenderState, MultiPointRenderState } from "./renderInteractive";

vi.mock("../binding/renderBindingHighlight", () => ({
  renderSuggestedBinding: vi.fn((_ctx, _el, _zoom, _theme) => {
    // Record calls on the actual ctx so we can verify it was invoked
    _ctx.save();
    _ctx.restore();
  }),
}));

describe("renderInteractiveScene", () => {
  it("renders nothing when no elements selected and no selection box", () => {
    const { ctx, calls } = createCanvasContextMock();
    renderInteractiveScene({
      ctx,
      selectedElements: [],
      elements: [],
      zoom: 1,
      selectionBox: null,
      theme: "light",
    });

    // No strokeRect or fillRect calls since nothing to render
    const strokeRectCalls = calls.filter((c) => c.method === "strokeRect");
    const fillRectCalls = calls.filter((c) => c.method === "fillRect");
    expect(strokeRectCalls).toHaveLength(0);
    expect(fillRectCalls).toHaveLength(0);
  });

  it("draws selection border for a single selected element", () => {
    const { ctx, getCallsFor } = createCanvasContextMock();
    const element = createTestElement({ id: "el-1", x: 10, y: 20, width: 100, height: 80 });

    renderInteractiveScene({
      ctx,
      selectedElements: [element],
      elements: [element],
      zoom: 1,
      selectionBox: null,
      theme: "light",
    });

    const strokeRectCalls = getCallsFor("strokeRect");
    expect(strokeRectCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("draws transform handles for selected element", () => {
    const { ctx, getCallsFor } = createCanvasContextMock();
    const element = createTestElement({ id: "el-1", x: 10, y: 20, width: 100, height: 80 });

    renderInteractiveScene({
      ctx,
      selectedElements: [element],
      elements: [element],
      zoom: 1,
      selectionBox: null,
      theme: "light",
    });

    // Transform handles use roundRect for corner/edge handles and arc for rotation handle
    const roundRectCalls = getCallsFor("roundRect");
    const arcCalls = getCallsFor("arc");
    const fillCalls = getCallsFor("fill");
    // At least some handles should be drawn (fill for each handle)
    expect(fillCalls.length).toBeGreaterThanOrEqual(1);
    // Should have roundRect calls for resize handles plus arc for rotation
    expect(roundRectCalls.length + arcCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("draws selection box when provided", () => {
    const { ctx, getCallsFor } = createCanvasContextMock();
    const box = { x: 50, y: 50, width: 200, height: 150 };

    renderInteractiveScene({
      ctx,
      selectedElements: [],
      elements: [],
      zoom: 1,
      selectionBox: box,
      theme: "light",
    });

    const fillRectCalls = getCallsFor("fillRect");
    const strokeRectCalls = getCallsFor("strokeRect");

    // renderSelectionBox calls both fillRect and strokeRect with box dimensions
    const matchingFill = fillRectCalls.some(
      (c) => c.args[0] === 50 && c.args[1] === 50 && c.args[2] === 200 && c.args[3] === 150,
    );
    const matchingStroke = strokeRectCalls.some(
      (c) => c.args[0] === 50 && c.args[1] === 50 && c.args[2] === 200 && c.args[3] === 150,
    );
    expect(matchingFill).toBe(true);
    expect(matchingStroke).toBe(true);
  });

  it("renders linear editor point handles when linearEditorState provided", () => {
    const { ctx, getCallsFor } = createCanvasContextMock();
    const arrow = createTestArrowElement({
      id: "arrow-1",
      x: 0,
      y: 0,
      points: [
        pointFrom<LocalPoint>(0, 0),
        pointFrom<LocalPoint>(100, 50),
        pointFrom<LocalPoint>(200, 0),
      ],
    });

    const linearEditorState: LinearEditorRenderState = {
      element: arrow,
      selectedPointIndices: new Set([0]),
      hoveredMidpointIndex: null,
    };

    renderInteractiveScene({
      ctx,
      selectedElements: [arrow],
      elements: [arrow],
      zoom: 1,
      selectionBox: null,
      theme: "light",
      linearEditorState,
    });

    // renderPointHandles draws arc for each point (3 points = 3 arc calls from point handles)
    const arcCalls = getCallsFor("arc");
    expect(arcCalls.length).toBeGreaterThanOrEqual(3);
  });

  it("renders rubber band when multiPointState provided", () => {
    const { ctx, getCallsFor } = createCanvasContextMock();
    const arrow = createTestArrowElement({
      id: "arrow-1",
      x: 10,
      y: 20,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 50)],
    });

    const multiPointState: MultiPointRenderState = {
      element: arrow,
      cursorPoint: pointFrom<GlobalPoint>(200, 150),
    };

    renderInteractiveScene({
      ctx,
      selectedElements: [],
      elements: [],
      zoom: 1,
      selectionBox: null,
      theme: "light",
      multiPointState,
    });

    // renderRubberBand draws moveTo + lineTo + stroke
    const moveToCalls = getCallsFor("moveTo");
    const lineToCalls = getCallsFor("lineTo");
    expect(moveToCalls.length).toBeGreaterThanOrEqual(1);
    expect(lineToCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("does not draw transform handles for multiple selected elements in a group", () => {
    const { ctx, calls } = createCanvasContextMock();
    const groupId = "group-1";
    const el1 = createTestElement({
      id: "el-1",
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      groupIds: [groupId],
    });
    const el2 = createTestElement({
      id: "el-2",
      x: 100,
      y: 0,
      width: 50,
      height: 50,
      groupIds: [groupId],
    });

    renderInteractiveScene({
      ctx,
      selectedElements: [el1, el2],
      elements: [el1, el2],
      zoom: 1,
      selectionBox: null,
      theme: "light",
      selectedGroupIds: new Set([groupId]),
    });

    // When elements are in a selected group, renderSelectedElements skips individual
    // selection borders and transform handles for those elements, only draws group border.
    // The roundRect / arc calls for transform handles should NOT appear for grouped elements.
    // Only strokeRect calls for group border should appear.
    const strokeRectCalls = calls.filter((c) => c.method === "strokeRect");
    expect(strokeRectCalls.length).toBeGreaterThanOrEqual(1); // Group border
    // No transform handle drawing (roundRect) for grouped elements
    const roundRectCalls = calls.filter((c) => c.method === "roundRect");
    expect(roundRectCalls).toHaveLength(0);
  });

  it("draws group border for elements in selected groups", () => {
    const { ctx, getCallsFor } = createCanvasContextMock();
    const groupId = "group-1";
    const el1 = createTestElement({
      id: "el-1",
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      groupIds: [groupId],
    });
    const el2 = createTestElement({
      id: "el-2",
      x: 100,
      y: 0,
      width: 50,
      height: 50,
      groupIds: [groupId],
    });

    renderInteractiveScene({
      ctx,
      selectedElements: [el1, el2],
      elements: [el1, el2],
      zoom: 1,
      selectionBox: null,
      theme: "light",
      selectedGroupIds: new Set([groupId]),
    });

    // Group border renders as strokeRect around common bounds
    const strokeRectCalls = getCallsFor("strokeRect");
    expect(strokeRectCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("renders suggested bindings when provided", () => {
    const { ctx, getCallsFor } = createCanvasContextMock();
    const bindTarget = createTestElement({ id: "target-1", x: 50, y: 50, width: 80, height: 80 });

    renderInteractiveScene({
      ctx,
      selectedElements: [],
      elements: [],
      zoom: 1,
      selectionBox: null,
      theme: "light",
      suggestedBindings: [bindTarget],
    });

    // renderSuggestedBinding is called which does save/restore on ctx
    const saveCalls = getCallsFor("save");
    const restoreCalls = getCallsFor("restore");
    expect(saveCalls.length).toBeGreaterThanOrEqual(1);
    expect(restoreCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("applies correct zoom scaling", () => {
    const { ctx, getCallsFor } = createCanvasContextMock();
    const element = createTestElement({ id: "el-1", x: 10, y: 20, width: 100, height: 80 });
    const zoom = 2;

    renderInteractiveScene({
      ctx,
      selectedElements: [element],
      elements: [element],
      zoom,
      selectionBox: null,
      theme: "light",
    });

    // setLineDash is called with values scaled by zoom (8/zoom, 4/zoom)
    const setLineDashCalls = getCallsFor("setLineDash");
    const selectionDashCall = setLineDashCalls.find((c) => {
      const args = c.args[0] as number[];
      return args.length === 2 && args[0] === 8 / zoom && args[1] === 4 / zoom;
    });
    expect(selectionDashCall).toBeDefined();
  });
});
