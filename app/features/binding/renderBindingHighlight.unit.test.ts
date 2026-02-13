import { describe, it, expect } from "vitest";
import { createCanvasContextMock } from "~/__test-utils__/mocks/canvasContextMock";
import {
  createTestElement,
  createTestArrowElement,
  createTestTextElement,
} from "~/__test-utils__/factories/element";
import { renderSuggestedBinding } from "./renderBindingHighlight";
import type { ExcalidrawElement } from "~/features/elements/types";

describe("renderSuggestedBinding", () => {
  it("renders rectangle binding highlight via strokeRect", () => {
    const { ctx, getCallsFor } = createCanvasContextMock();
    const el = createTestElement({ type: "rectangle", x: 10, y: 20, width: 100, height: 50 });

    renderSuggestedBinding(ctx, el, 1, "light");

    expect(getCallsFor("strokeRect")).toHaveLength(1);
  });

  it("renders ellipse binding highlight via ellipse", () => {
    const { ctx, getCallsFor } = createCanvasContextMock();
    const el = createTestElement({ type: "ellipse", x: 10, y: 20, width: 80, height: 60 });

    renderSuggestedBinding(ctx, el, 1, "light");

    expect(getCallsFor("ellipse")).toHaveLength(1);
  });

  it("renders diamond binding highlight via moveTo and lineTo", () => {
    const { ctx, getCallsFor } = createCanvasContextMock();
    const el = createTestElement({ type: "diamond", x: 0, y: 0, width: 100, height: 100 });

    renderSuggestedBinding(ctx, el, 1, "light");

    expect(getCallsFor("moveTo")).toHaveLength(1);
    expect(getCallsFor("lineTo")).toHaveLength(3);
  });

  it("skips arrow elements with no draw calls", () => {
    const { ctx, getCallsFor } = createCanvasContextMock();
    const el = createTestArrowElement();

    renderSuggestedBinding(ctx, el, 1, "light");

    expect(getCallsFor("strokeRect")).toHaveLength(0);
    expect(getCallsFor("ellipse")).toHaveLength(0);
    expect(getCallsFor("moveTo")).toHaveLength(0);
    expect(getCallsFor("save")).toHaveLength(0);
  });

  it("skips text elements with no draw calls", () => {
    const { ctx, getCallsFor } = createCanvasContextMock();
    const el = createTestTextElement();

    renderSuggestedBinding(ctx, el, 1, "light");

    expect(getCallsFor("strokeRect")).toHaveLength(0);
    expect(getCallsFor("save")).toHaveLength(0);
  });

  it("applies correct stroke color for light theme", () => {
    const { ctx, calls } = createCanvasContextMock();
    const el = createTestElement({ type: "rectangle" });

    renderSuggestedBinding(ctx, el, 1, "light");

    const strokeColorSet = calls.find((c) => c.method === "set:strokeStyle");
    expect(strokeColorSet?.args[0]).toBe("#4a90d9");
  });

  it("applies correct stroke color for dark theme", () => {
    const { ctx, calls } = createCanvasContextMock();
    const el = createTestElement({ type: "rectangle" });

    renderSuggestedBinding(ctx, el, 1, "dark");

    const strokeColorSet = calls.find((c) => c.method === "set:strokeStyle");
    expect(strokeColorSet?.args[0]).toBe("rgba(3, 93, 161, 1)");
  });

  it("scales padding by zoom", () => {
    const { ctx, getCallsFor } = createCanvasContextMock();
    const el = createTestElement({ type: "rectangle", x: 0, y: 0, width: 100, height: 100 });

    renderSuggestedBinding(ctx, el, 2, "light");

    // BINDING_HIGHLIGHT_PADDING = 6, zoom = 2, padding = 6/2 = 3
    const strokeRectCall = getCallsFor("strokeRect")[0]!;
    // args: [-width/2 - padding, -height/2 - padding, width + padding*2, height + padding*2]
    // = [-50 - 3, -50 - 3, 100 + 6, 100 + 6] = [-53, -53, 106, 106]
    expect(strokeRectCall.args[0]).toBe(-53);
    expect(strokeRectCall.args[1]).toBe(-53);
    expect(strokeRectCall.args[2]).toBe(106);
    expect(strokeRectCall.args[3]).toBe(106);
  });

  it("scales line width by zoom", () => {
    const { ctx, calls } = createCanvasContextMock();
    const el = createTestElement({ type: "rectangle" });

    renderSuggestedBinding(ctx, el, 2, "light");

    // BINDING_HIGHLIGHT_LINE_WIDTH = 2, zoom = 2, lineWidth = 2/2 = 1
    const lineWidthSet = calls.find((c) => c.method === "set:lineWidth");
    expect(lineWidthSet?.args[0]).toBe(1);
  });

  it("applies rotation via ctx.rotate", () => {
    const { ctx, getCallsFor } = createCanvasContextMock();
    const el = createTestElement({ type: "rectangle", angle: (Math.PI / 4) as never });

    renderSuggestedBinding(ctx, el, 1, "light");

    const rotateCalls = getCallsFor("rotate");
    expect(rotateCalls).toHaveLength(1);
    expect(rotateCalls[0]!.args[0]).toBeCloseTo(Math.PI / 4);
  });

  it("translates to element center", () => {
    const { ctx, getCallsFor } = createCanvasContextMock();
    const el = createTestElement({ type: "rectangle", x: 20, y: 40, width: 100, height: 60 });

    renderSuggestedBinding(ctx, el, 1, "light");

    const translateCalls = getCallsFor("translate");
    expect(translateCalls).toHaveLength(1);
    // cx = 20 + 100/2 = 70, cy = 40 + 60/2 = 70
    expect(translateCalls[0]!.args[0]).toBe(70);
    expect(translateCalls[0]!.args[1]).toBe(70);
  });

  it("throws for unhandled element type", () => {
    const { ctx } = createCanvasContextMock();
    const el = {
      type: "unknown_type",
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      angle: 0,
    } as unknown as ExcalidrawElement;

    expect(() => renderSuggestedBinding(ctx, el, 1, "light")).toThrow("Unhandled element type");
  });
});
