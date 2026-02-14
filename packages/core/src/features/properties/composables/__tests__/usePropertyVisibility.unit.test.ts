import { computed, shallowRef } from "vue";
import { describe, it, expect } from "vitest";
import { withSetup } from "../../../../__test-utils__/withSetup";
import {
  createTestElement,
  createTestArrowElement,
  createTestTextElement,
  createTestImageElement,
} from "../../../../__test-utils__/factories/element";
import type { ExcalidrawElement } from "../../../elements/types";
import type { ToolType } from "../../../tools/types";
import { usePropertyVisibility } from "../usePropertyVisibility";

function setup(elements: ExcalidrawElement[] = [], tool?: ToolType) {
  const elRef = shallowRef(elements);
  const selectedElements = computed(() => elRef.value);
  const activeTool = tool ? shallowRef<ToolType>(tool) : undefined;
  const visibility = withSetup(() => usePropertyVisibility(selectedElements, activeTool));
  return { visibility, elRef, activeTool };
}

describe("usePropertyVisibility", () => {
  it("showStrokeColor is true for rectangle", () => {
    const { visibility } = setup([createTestElement({ type: "rectangle" })]);
    expect(visibility.showStrokeColor.value).toBe(true);
  });

  it("showStrokeColor is true for arrow", () => {
    const { visibility } = setup([createTestArrowElement()]);
    expect(visibility.showStrokeColor.value).toBe(true);
  });

  it("showStrokeColor is false for image", () => {
    const { visibility } = setup([createTestImageElement()]);
    expect(visibility.showStrokeColor.value).toBe(false);
  });

  it("showBackground is true for rectangle", () => {
    const { visibility } = setup([createTestElement({ type: "rectangle" })]);
    expect(visibility.showBackground.value).toBe(true);
  });

  it("showBackground is false for text", () => {
    const { visibility } = setup([createTestTextElement()]);
    expect(visibility.showBackground.value).toBe(false);
  });

  it("showBackground is false for arrow", () => {
    const { visibility } = setup([createTestArrowElement()]);
    expect(visibility.showBackground.value).toBe(false);
  });

  it("showFillStyle matches showBackground (same element set)", () => {
    const { visibility: rectVis } = setup([createTestElement({ type: "rectangle" })]);
    expect(rectVis.showFillStyle.value).toBe(true);

    const { visibility: textVis } = setup([createTestTextElement()]);
    expect(textVis.showFillStyle.value).toBe(false);
  });

  it("showRoundness is true for rectangle", () => {
    const { visibility } = setup([createTestElement({ type: "rectangle" })]);
    expect(visibility.showRoundness.value).toBe(true);
  });

  it("showRoundness is true for diamond", () => {
    const { visibility } = setup([createTestElement({ type: "diamond" })]);
    expect(visibility.showRoundness.value).toBe(true);
  });

  it("showRoundness is false for ellipse", () => {
    const { visibility } = setup([createTestElement({ type: "ellipse" })]);
    expect(visibility.showRoundness.value).toBe(false);
  });

  it("hasText is true for text element", () => {
    const { visibility } = setup([createTestTextElement()]);
    expect(visibility.hasText.value).toBe(true);
  });

  it("hasArrow is true for arrow element", () => {
    const { visibility } = setup([createTestArrowElement()]);
    expect(visibility.hasArrow.value).toBe(true);
  });

  it("falls back to active tool when no selection", () => {
    const { visibility } = setup([], "rectangle");
    expect(visibility.showStrokeColor.value).toBe(true);
    expect(visibility.showBackground.value).toBe(true);
    expect(visibility.showRoundness.value).toBe(true);
  });

  it("does not fall back to tool when elements are selected", () => {
    const { visibility } = setup([createTestTextElement()], "rectangle");
    // text has stroke color but not background
    expect(visibility.showStrokeColor.value).toBe(true);
    expect(visibility.showBackground.value).toBe(false);
  });

  it("does not fall back to non-element tools like selection", () => {
    const { visibility } = setup([], "selection");
    expect(visibility.showStrokeColor.value).toBe(false);
    expect(visibility.showBackground.value).toBe(false);
  });

  it("mixed selection shows union of properties", () => {
    const { visibility } = setup([
      createTestElement({ type: "rectangle" }),
      createTestArrowElement(),
    ]);
    // rectangle has background, arrow does not, but union means true
    expect(visibility.showBackground.value).toBe(true);
    // both have stroke color
    expect(visibility.showStrokeColor.value).toBe(true);
    // arrow has arrow
    expect(visibility.hasArrow.value).toBe(true);
  });

  it("showColors is true when either strokeColor or background is visible", () => {
    const { visibility } = setup([createTestTextElement()]);
    // text has strokeColor but no background
    expect(visibility.showColors.value).toBe(true);
  });

  it("showStyleGroup is true when fillStyle, strokeWidth, or strokeStyle is visible", () => {
    const { visibility } = setup([createTestElement({ type: "rectangle" })]);
    expect(visibility.showStyleGroup.value).toBe(true);
  });
});
