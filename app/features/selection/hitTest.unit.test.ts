import { createTestElement } from "~/__test-utils__/factories/element";
import { createTestPoint } from "~/__test-utils__/factories/point";
import { hitTest, getElementAtPosition } from "./hitTest";

describe("hitTest", () => {
  describe("rectangle", () => {
    it("hits center of filled rectangle", () => {
      const el = createTestElement({
        type: "rectangle",
        x: 10,
        y: 10,
        width: 100,
        height: 50,
        backgroundColor: "#ff0000",
      });
      expect(hitTest(createTestPoint(60, 35), el, 1)).toBe(true);
    });

    it("hits interior of outline-only rectangle", () => {
      const el = createTestElement({
        type: "rectangle",
        x: 10,
        y: 10,
        width: 100,
        height: 50,
        backgroundColor: "transparent",
      });
      expect(hitTest(createTestPoint(60, 35), el, 1)).toBe(true);
    });

    it("hits stroke of outline-only rectangle", () => {
      const el = createTestElement({
        type: "rectangle",
        x: 10,
        y: 10,
        width: 100,
        height: 50,
        backgroundColor: "transparent",
      });
      expect(hitTest(createTestPoint(10, 35), el, 1)).toBe(true);
    });

    it("misses point far outside rectangle", () => {
      const el = createTestElement({
        type: "rectangle",
        x: 10,
        y: 10,
        width: 100,
        height: 50,
        backgroundColor: "#ff0000",
      });
      expect(hitTest(createTestPoint(500, 500), el, 1)).toBe(false);
    });

    it("threshold grows at low zoom (easier to click)", () => {
      const el = createTestElement({
        type: "rectangle",
        x: 10,
        y: 10,
        width: 100,
        height: 50,
        backgroundColor: "transparent",
      });
      // Point 15px from edge — misses at zoom=1 (threshold ~10px)
      expect(hitTest(createTestPoint(-5, 35), el, 1)).toBe(false);
      // But hits at zoom=0.2 (threshold = 10/0.2 = 50px)
      expect(hitTest(createTestPoint(-5, 35), el, 0.2)).toBe(true);
    });
  });

  describe("ellipse", () => {
    it("hits inside filled ellipse", () => {
      const el = createTestElement({
        type: "ellipse",
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        backgroundColor: "#ff0000",
      });
      expect(hitTest(createTestPoint(50, 50), el, 1)).toBe(true);
    });

    it("hits inside outline-only ellipse", () => {
      const el = createTestElement({
        type: "ellipse",
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        backgroundColor: "transparent",
      });
      expect(hitTest(createTestPoint(50, 50), el, 1)).toBe(true);
    });

    it("hits ellipse boundary within threshold", () => {
      const el = createTestElement({
        type: "ellipse",
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        backgroundColor: "transparent",
      });
      // Right edge of ellipse: x=100, y=50
      expect(hitTest(createTestPoint(100, 50), el, 1)).toBe(true);
    });

    it("misses corner of bounding box (outside ellipse)", () => {
      const el = createTestElement({
        type: "ellipse",
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        backgroundColor: "#ff0000",
      });
      // Corner of bounding box is outside the ellipse
      expect(hitTest(createTestPoint(2, 2), el, 1)).toBe(false);
    });
  });

  describe("diamond", () => {
    it("hits inside filled diamond", () => {
      const el = createTestElement({
        type: "diamond",
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        backgroundColor: "#ff0000",
      });
      expect(hitTest(createTestPoint(50, 50), el, 1)).toBe(true);
    });

    it("misses corner region (outside diamond shape)", () => {
      const el = createTestElement({
        type: "diamond",
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        backgroundColor: "#ff0000",
      });
      // Corner of bounding box is outside the diamond
      expect(hitTest(createTestPoint(2, 2), el, 1)).toBe(false);
    });

    it("hits diamond edge within threshold", () => {
      const el = createTestElement({
        type: "diamond",
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        backgroundColor: "transparent",
      });
      // Top vertex of diamond: (50, 0)
      expect(hitTest(createTestPoint(50, 0), el, 1)).toBe(true);
    });
  });

  it("skips deleted elements", () => {
    const el = createTestElement({
      isDeleted: true,
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      backgroundColor: "#f00",
    });
    expect(hitTest(createTestPoint(50, 50), el, 1)).toBe(false);
  });
});

describe("getElementAtPosition", () => {
  it("returns topmost element when overlapping", () => {
    const bottom = createTestElement({
      id: "a",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      backgroundColor: "#f00",
    });
    const top = createTestElement({
      id: "b",
      x: 50,
      y: 50,
      width: 100,
      height: 100,
      backgroundColor: "#00f",
    });
    expect(getElementAtPosition(createTestPoint(75, 75), [bottom, top], 1)?.id).toBe("b");
  });

  it("skips deleted elements", () => {
    const el = createTestElement({
      isDeleted: true,
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      backgroundColor: "#f00",
    });
    expect(getElementAtPosition(createTestPoint(50, 50), [el], 1)).toBeNull();
  });

  it("returns null when clicking empty space", () => {
    const el = createTestElement({
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      backgroundColor: "#f00",
    });
    expect(getElementAtPosition(createTestPoint(200, 200), [el], 1)).toBeNull();
  });
});

describe("hitTest edge cases", () => {
  it("returns false for zero-size rectangle", () => {
    const el = createTestElement({
      x: 50,
      y: 50,
      width: 0,
      height: 0,
      backgroundColor: "#f00",
    });
    // Point at the element origin — zero-size means nothing to hit beyond threshold
    expect(hitTest(createTestPoint(100, 100), el, 1)).toBe(false);
  });

  it("returns false for zero-size ellipse", () => {
    const el = createTestElement({
      type: "ellipse",
      x: 50,
      y: 50,
      width: 0,
      height: 0,
      backgroundColor: "#f00",
    });
    expect(hitTest(createTestPoint(100, 100), el, 1)).toBe(false);
  });

  it("handles zero-size diamond", () => {
    const el = createTestElement({
      type: "diamond",
      x: 50,
      y: 50,
      width: 0,
      height: 0,
      backgroundColor: "#f00",
    });
    // Zero-size diamond collapses to a point — should not hit a distant point
    expect(hitTest(createTestPoint(100, 100), el, 1)).toBe(false);
  });
});
