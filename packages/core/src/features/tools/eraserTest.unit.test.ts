import { lineSegment, pointFrom } from "../../shared/math";
import type { GlobalPoint, LocalPoint } from "../../shared/math";
import { createTestElement, createTestArrowElement } from "../../__test-utils__/factories/element";
import { eraserTest } from "./eraserTest";

function seg(x1: number, y1: number, x2: number, y2: number) {
  return lineSegment<GlobalPoint>(pointFrom<GlobalPoint>(x1, y1), pointFrom<GlobalPoint>(x2, y2));
}

// Empty map is fine for simple shapes — upstream functions fallback gracefully
const emptyMap = new Map() as Parameters<typeof eraserTest>[2];

describe("eraserTest", () => {
  describe("rectangle", () => {
    const rect = createTestElement({ id: "r1", x: 50, y: 50, width: 100, height: 80 });

    it("returns true when segment crosses the edge", () => {
      // Horizontal line crossing the left edge
      expect(eraserTest(seg(30, 90, 70, 90), rect, emptyMap, 1)).toBe(true);
    });

    it("returns true when segment endpoint is inside a filled shape", () => {
      const filled = createTestElement({
        id: "r2",
        x: 50,
        y: 50,
        width: 100,
        height: 80,
        backgroundColor: "#ff0000",
        fillStyle: "solid",
      });
      // Segment endpoint inside the rectangle
      expect(eraserTest(seg(80, 70, 100, 90), filled, emptyMap, 1)).toBe(true);
    });

    it("returns false when segment is far away", () => {
      expect(eraserTest(seg(0, 0, 10, 10), rect, emptyMap, 1)).toBe(false);
    });

    it("returns false for deleted elements", () => {
      const deleted = createTestElement({
        id: "r3",
        x: 50,
        y: 50,
        width: 100,
        height: 80,
        isDeleted: true,
      });
      expect(eraserTest(seg(30, 90, 70, 90), deleted, emptyMap, 1)).toBe(false);
    });
  });

  describe("ellipse", () => {
    const ellipse = createTestElement({
      type: "ellipse",
      id: "e1",
      x: 50,
      y: 50,
      width: 100,
      height: 80,
    });

    it("returns true when segment crosses the ellipse boundary", () => {
      // Segment crossing through the top of the ellipse
      expect(eraserTest(seg(100, 30, 100, 70), ellipse, emptyMap, 1)).toBe(true);
    });

    it("returns false when segment is far away", () => {
      expect(eraserTest(seg(0, 0, 10, 10), ellipse, emptyMap, 1)).toBe(false);
    });
  });

  describe("diamond", () => {
    const diamond = createTestElement({
      type: "diamond",
      id: "d1",
      x: 50,
      y: 50,
      width: 100,
      height: 100,
    });

    it("returns true when segment crosses the diamond edge", () => {
      // Segment crossing the top-left edge of diamond
      expect(eraserTest(seg(50, 80, 90, 80), diamond, emptyMap, 1)).toBe(true);
    });

    it("returns false when segment is far away", () => {
      expect(eraserTest(seg(0, 0, 10, 10), diamond, emptyMap, 1)).toBe(false);
    });
  });

  describe("arrow / linear elements", () => {
    const arrow = createTestArrowElement({
      id: "a1",
      x: 10,
      y: 10,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 50)],
      strokeWidth: 2,
    });

    it("returns true when segment is close to the arrow line", () => {
      // Segment crossing the arrow's midpoint area
      expect(eraserTest(seg(50, 25, 70, 45), arrow, emptyMap, 1)).toBe(true);
    });

    it("returns false when segment is far from arrow", () => {
      expect(eraserTest(seg(0, 200, 10, 200), arrow, emptyMap, 1)).toBe(false);
    });
  });

  describe("bounding box rejection", () => {
    const rect = createTestElement({ id: "bb1", x: 500, y: 500, width: 50, height: 50 });

    it("rejects quickly when segment is far from element", () => {
      // This tests the fast path — segment is nowhere near the element
      expect(eraserTest(seg(0, 0, 10, 10), rect, emptyMap, 1)).toBe(false);
    });
  });

  describe("zoom affects tolerance", () => {
    const arrow = createTestArrowElement({
      id: "z1",
      x: 10,
      y: 10,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 0)],
      strokeWidth: 2,
    });

    it("uses larger tolerance at lower zoom", () => {
      // At zoom 0.5, tolerance = max(2, 2*2/0.5) = 8, should hit from further away
      const farSegment = seg(60, 17, 62, 17);
      expect(eraserTest(farSegment, arrow, emptyMap, 0.5)).toBe(true);
    });
  });
});
