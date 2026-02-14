import { pointFrom } from "../../shared/math";
import type { LocalPoint } from "../../shared/math";
import {
  createTestElement,
  createTestTextElement,
  createTestArrowElement,
} from "../../__test-utils__/factories/element";
import type { ElementsMap } from "../elements/types";
import {
  bindTextToContainer,
  unbindTextFromContainer,
  deleteBoundTextForContainer,
  updateBoundTextAfterContainerChange,
  updateBoundTextOnArrow,
  createBoundTextForArrow,
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

vi.mock("./arrowMidpoint", () => ({
  getArrowMidpoint: (arrow: Record<string, unknown>) => {
    // Simple mock: return the midpoint between first and last point in global coords
    const points = arrow.points as Array<[number, number]>;
    const ax = (arrow.x as number) ?? 0;
    const ay = (arrow.y as number) ?? 0;
    if (!points || points.length < 2) return [ax, ay];
    const last = points.at(-1)!;
    return [ax + last[0] / 2, ay + last[1] / 2];
  },
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

describe("updateBoundTextOnArrow", () => {
  it("positions text centered at arrow midpoint", () => {
    const textEl = createTestTextElement({
      id: "text-1",
      containerId: "arrow-1",
      width: 40,
      height: 20,
    });
    const arrow = createTestArrowElement({
      id: "arrow-1",
      x: 0,
      y: 0,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(200, 100)],
      boundElements: [{ id: "text-1", type: "text" as const }],
    });
    const elementMap = toElementsMap([
      [textEl.id, textEl],
      [arrow.id, arrow],
    ]);

    updateBoundTextOnArrow(arrow, elementMap);

    // Mock getArrowMidpoint returns (0 + 200/2, 0 + 100/2) = (100, 50)
    // Text centered: x = 100 - 40/2 = 80, y = 50 - 20/2 = 40
    expect(textEl.x).toBe(80);
    expect(textEl.y).toBe(40);
  });

  it("does nothing when no bound text exists", () => {
    const arrow = createTestArrowElement({
      id: "arrow-1",
      x: 0,
      y: 0,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 50)],
    });
    const elementMap = toElementsMap([[arrow.id, arrow]]);

    // Should not throw and arrow should remain unchanged
    updateBoundTextOnArrow(arrow, elementMap);

    expect(arrow.boundElements).toBeNull();
  });

  it("repositions text when arrow points change", () => {
    const textEl = createTestTextElement({
      id: "text-1",
      containerId: "arrow-1",
      width: 40,
      height: 20,
      x: 0,
      y: 0,
    });
    const arrow = createTestArrowElement({
      id: "arrow-1",
      x: 0,
      y: 0,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 0)],
      boundElements: [{ id: "text-1", type: "text" as const }],
    });
    const elementMap = toElementsMap([
      [textEl.id, textEl],
      [arrow.id, arrow],
    ]);

    // First positioning: midpoint at (50, 0) => text at (30, -10)
    updateBoundTextOnArrow(arrow, elementMap);
    expect(textEl.x).toBe(30);
    expect(textEl.y).toBe(-10);

    // Mutate arrow points (simulate moving end point)
    Object.assign(arrow, {
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(200, 100)],
    });

    // Reposition: midpoint at (100, 50) => text at (80, 40)
    updateBoundTextOnArrow(arrow, elementMap);
    expect(textEl.x).toBe(80);
    expect(textEl.y).toBe(40);
  });
});

describe("createBoundTextForArrow", () => {
  it("creates a text element bound to the arrow", () => {
    const arrow = createTestArrowElement({
      id: "arrow-1",
      x: 0,
      y: 0,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(200, 100)],
    });

    const textEl = createBoundTextForArrow(arrow, "Label", 16, 1);

    expect(textEl.type).toBe("text");
    expect(textEl.text).toBe("Label");
    expect(textEl.originalText).toBe("Label");
    expect(textEl.fontSize).toBe(16);
    expect(textEl.fontFamily).toBe(1);
    expect(textEl.containerId).toBe("arrow-1");
  });

  it("adds text entry to arrow boundElements", () => {
    const arrow = createTestArrowElement({
      id: "arrow-1",
      x: 0,
      y: 0,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 50)],
    });

    const textEl = createBoundTextForArrow(arrow, "Test", 20, 1);

    expect(arrow.boundElements).toEqual([{ id: textEl.id, type: "text" }]);
  });

  it("preserves existing boundElements on arrow", () => {
    const arrow = createTestArrowElement({
      id: "arrow-1",
      x: 0,
      y: 0,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 50)],
      boundElements: [{ id: "existing-1", type: "arrow" as const }],
    });

    const textEl = createBoundTextForArrow(arrow, "Test", 20, 1);

    expect(arrow.boundElements).toEqual([
      { id: "existing-1", type: "arrow" },
      { id: textEl.id, type: "text" },
    ]);
  });
});
