import { createTestElement, createTestTextElement } from "../../__test-utils__/factories/element";
import type { ElementsMap } from "../elements/types";
import {
  bindTextToContainer,
  unbindTextFromContainer,
  deleteBoundTextForContainer,
  updateBoundTextAfterContainerChange,
} from "./boundText";

vi.mock("../rendering/textMeasurement", () => ({
  getFontString: (fontSize: number, _fontFamily: number) => `${fontSize}px sans-serif`,
  measureText: (_text: string, _font: string, _lineHeight: number) => ({ width: 80, height: 20 }),
}));

vi.mock("../elements", () => ({
  getBoundTextElement: (container: Record<string, unknown>, elementMap: Map<string, unknown>) => {
    const boundElements = (container.boundElements ?? []) as Array<{ id: string; type: string }>;
    const bound = boundElements.find((be) => be.type === "text");
    if (!bound) return null;
    return elementMap.get(bound.id) ?? null;
  },
  BOUND_TEXT_PADDING: 5,
}));

function toElementsMap(entries: Array<[string, unknown]>): ElementsMap {
  return new Map(entries) as unknown as ElementsMap;
}

describe("bindTextToContainer", () => {
  it("sets containerId on text element", () => {
    const textEl = createTestTextElement({ id: "text-1" });
    const container = createTestElement({ id: "container-1" });

    bindTextToContainer(textEl, container);

    expect(textEl.containerId).toBe("container-1");
  });

  it("adds text to container boundElements", () => {
    const textEl = createTestTextElement({ id: "text-1" });
    const container = createTestElement({ id: "container-1" });

    bindTextToContainer(textEl, container);

    expect(container.boundElements).toEqual([{ id: "text-1", type: "text" }]);
  });

  it("does not duplicate if already bound", () => {
    const textEl = createTestTextElement({ id: "text-1", containerId: "container-1" });
    const container = createTestElement({
      id: "container-1",
      boundElements: [{ id: "text-1", type: "text" as const }],
    });

    bindTextToContainer(textEl, container);

    expect(container.boundElements).toEqual([{ id: "text-1", type: "text" }]);
  });
});

describe("unbindTextFromContainer", () => {
  it("clears containerId", () => {
    const textEl = createTestTextElement({ id: "text-1", containerId: "container-1" });
    const container = createTestElement({
      id: "container-1",
      boundElements: [{ id: "text-1", type: "text" as const }],
    });

    unbindTextFromContainer(textEl, container);

    expect(textEl.containerId).toBeNull();
  });

  it("removes from container boundElements", () => {
    const textEl = createTestTextElement({ id: "text-1", containerId: "container-1" });
    const container = createTestElement({
      id: "container-1",
      boundElements: [{ id: "text-1", type: "text" as const }],
    });

    unbindTextFromContainer(textEl, container);

    expect(container.boundElements).toEqual([]);
  });
});

describe("deleteBoundTextForContainer", () => {
  it("marks bound text as deleted", () => {
    const textEl = createTestTextElement({ id: "text-1", containerId: "container-1" });
    const container = createTestElement({
      id: "container-1",
      boundElements: [{ id: "text-1", type: "text" as const }],
    });
    const elementMap = toElementsMap([
      [textEl.id, textEl],
      [container.id, container],
    ]);

    deleteBoundTextForContainer(container, elementMap);

    expect(textEl.isDeleted).toBe(true);
  });

  it("does nothing when no bound text", () => {
    const container = createTestElement({ id: "container-1" });
    const elementMap = toElementsMap([[container.id, container]]);

    deleteBoundTextForContainer(container, elementMap);

    expect(container.isDeleted).toBe(false);
  });
});

describe("updateBoundTextAfterContainerChange", () => {
  it("centers text within container", () => {
    const textEl = createTestTextElement({
      id: "text-1",
      containerId: "container-1",
      fontSize: 20,
      fontFamily: 1,
      lineHeight: 1.25 as number & { _brand: "unitlessLineHeight" },
      originalText: "Hello",
    });
    const container = createTestElement({
      id: "container-1",
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      boundElements: [{ id: "text-1", type: "text" as const }],
    });
    const elementMap = toElementsMap([
      [textEl.id, textEl],
      [container.id, container],
    ]);

    updateBoundTextAfterContainerChange(container, elementMap);

    // BOUND_TEXT_PADDING = 5, container.width = 200
    // maxWidth = 200 - 5*2 = 190
    // x = 0 + (200 - 190) / 2 = 5
    expect(textEl.x).toBe(5);
    // measureText returns height=20, container.height=100
    // y = 0 + (100 - 20) / 2 = 40
    expect(textEl.y).toBe(40);
    expect(textEl.width).toBe(190);
    expect(textEl.height).toBe(20);
  });
});
