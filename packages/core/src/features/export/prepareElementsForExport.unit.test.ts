import { describe, expect, it } from "vitest";
import {
  createTestElement,
  createTestTextElement,
  createTestArrowElement,
} from "../../__test-utils__/factories/element";
import { prepareElementsForExport } from "./prepareElementsForExport";

describe("prepareElementsForExport", () => {
  it("returns all non-deleted when selectedIds is null", () => {
    const el1 = createTestElement({ id: "r1" });
    const el2 = createTestElement({ id: "r2" });
    const deleted = createTestElement({ id: "r3", isDeleted: true });

    const result = prepareElementsForExport([el1, el2, deleted], null);

    expect(result).toEqual([el1, el2]);
  });

  it("returns all non-deleted when selectedIds is empty set", () => {
    const el1 = createTestElement({ id: "r1" });
    const el2 = createTestElement({ id: "r2" });
    const deleted = createTestElement({ id: "r3", isDeleted: true });

    const result = prepareElementsForExport([el1, el2, deleted], new Set());

    expect(result).toEqual([el1, el2]);
  });

  it("returns only selected when no bound text", () => {
    const el1 = createTestElement({ id: "r1" });
    const el2 = createTestElement({ id: "r2" });

    const result = prepareElementsForExport([el1, el2], new Set(["r1"]));

    expect(result).toEqual([el1]);
  });

  it("includes bound text for selected container", () => {
    const rect = createTestElement({
      id: "rect-1",
      boundElements: [{ id: "text-1", type: "text" }],
    });
    const text = createTestTextElement({ id: "text-1", containerId: "rect-1" });

    const result = prepareElementsForExport([rect, text], new Set(["rect-1"]));

    expect(result).toEqual([rect, text]);
  });

  it("includes container when bound text is selected", () => {
    const rect = createTestElement({
      id: "rect-1",
      boundElements: [{ id: "text-1", type: "text" }],
    });
    const text = createTestTextElement({ id: "text-1", containerId: "rect-1" });

    const result = prepareElementsForExport([rect, text], new Set(["text-1"]));

    expect(result).toEqual([rect, text]);
  });

  it("excludes deleted elements even if selected", () => {
    const deleted = createTestElement({ id: "r1", isDeleted: true });
    const alive = createTestElement({ id: "r2" });

    const result = prepareElementsForExport([deleted, alive], new Set(["r1", "r2"]));

    expect(result).toEqual([alive]);
  });

  it("does NOT include arrow-type bound elements", () => {
    const rect = createTestElement({
      id: "rect-1",
      boundElements: [{ id: "arrow-1", type: "arrow" }],
    });
    const arrow = createTestArrowElement({ id: "arrow-1" });

    const result = prepareElementsForExport([rect, arrow], new Set(["rect-1"]));

    expect(result).toEqual([rect]);
  });
});
