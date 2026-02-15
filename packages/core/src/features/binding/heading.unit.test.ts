import { pointFrom } from "../../shared/math";
import type { GlobalPoint, Vector } from "../../shared/math";
import type { Bounds } from "../selection/bounds";
import {
  vectorToHeading,
  flipHeading,
  compareHeading,
  headingIsHorizontal,
  headingIsVertical,
  headingForPoint,
  headingForPointIsHorizontal,
  headingForPointFromElement,
  HEADING_RIGHT,
  HEADING_DOWN,
  HEADING_LEFT,
  HEADING_UP,
} from "./heading";

describe("heading", () => {
  describe("vectorToHeading", () => {
    it("snaps rightward vector to HEADING_RIGHT", () => {
      expect(vectorToHeading([5, 1] as Vector)).toEqual(HEADING_RIGHT);
    });

    it("snaps leftward vector to HEADING_LEFT", () => {
      expect(vectorToHeading([-5, 1] as Vector)).toEqual(HEADING_LEFT);
    });

    it("snaps downward vector to HEADING_DOWN", () => {
      expect(vectorToHeading([1, 5] as Vector)).toEqual(HEADING_DOWN);
    });

    it("snaps upward vector to HEADING_UP", () => {
      expect(vectorToHeading([1, -5] as Vector)).toEqual(HEADING_UP);
    });

    it("snaps diagonal NE to RIGHT when x > |y|", () => {
      expect(vectorToHeading([3, -2] as Vector)).toEqual(HEADING_RIGHT);
    });

    it("snaps diagonal NE to UP when |y| > x", () => {
      expect(vectorToHeading([2, -3] as Vector)).toEqual(HEADING_UP);
    });

    it("snaps exact diagonal (45deg) to UP", () => {
      // When x === |y|, y>absX is false, so it falls through to UP
      expect(vectorToHeading([3, -3] as Vector)).toEqual(HEADING_UP);
    });

    it("handles zero vector as LEFT (0 <= -0)", () => {
      // With [0,0]: x(0) <= -absY(0) is true (0 <= -0), so HEADING_LEFT
      expect(vectorToHeading([0, 0] as Vector)).toEqual(HEADING_LEFT);
    });
  });

  describe("flipHeading", () => {
    it("flips RIGHT to LEFT", () => {
      expect(flipHeading(HEADING_RIGHT)).toEqual(HEADING_LEFT);
    });

    it("flips LEFT to RIGHT", () => {
      expect(flipHeading(HEADING_LEFT)).toEqual(HEADING_RIGHT);
    });

    it("flips DOWN to UP", () => {
      expect(flipHeading(HEADING_DOWN)).toEqual(HEADING_UP);
    });

    it("flips UP to DOWN", () => {
      expect(flipHeading(HEADING_UP)).toEqual(HEADING_DOWN);
    });
  });

  describe("compareHeading", () => {
    it("returns true for equal headings", () => {
      expect(compareHeading(HEADING_RIGHT, HEADING_RIGHT)).toBe(true);
      expect(compareHeading(HEADING_UP, HEADING_UP)).toBe(true);
    });

    it("returns false for different headings", () => {
      expect(compareHeading(HEADING_RIGHT, HEADING_LEFT)).toBe(false);
      expect(compareHeading(HEADING_UP, HEADING_DOWN)).toBe(false);
    });
  });

  describe("headingIsHorizontal", () => {
    it("returns true for RIGHT", () => {
      expect(headingIsHorizontal(HEADING_RIGHT)).toBe(true);
    });

    it("returns true for LEFT", () => {
      expect(headingIsHorizontal(HEADING_LEFT)).toBe(true);
    });

    it("returns false for UP", () => {
      expect(headingIsHorizontal(HEADING_UP)).toBe(false);
    });

    it("returns false for DOWN", () => {
      expect(headingIsHorizontal(HEADING_DOWN)).toBe(false);
    });
  });

  describe("headingIsVertical", () => {
    it("returns true for UP", () => {
      expect(headingIsVertical(HEADING_UP)).toBe(true);
    });

    it("returns true for DOWN", () => {
      expect(headingIsVertical(HEADING_DOWN)).toBe(true);
    });

    it("returns false for LEFT", () => {
      expect(headingIsVertical(HEADING_LEFT)).toBe(false);
    });
  });

  describe("headingForPoint", () => {
    it("returns RIGHT when p is to the right of o", () => {
      const p = pointFrom<GlobalPoint>(10, 0);
      const o = pointFrom<GlobalPoint>(0, 0);
      expect(headingForPoint(p, o)).toEqual(HEADING_RIGHT);
    });

    it("returns DOWN when p is below o", () => {
      const p = pointFrom<GlobalPoint>(0, 10);
      const o = pointFrom<GlobalPoint>(0, 0);
      expect(headingForPoint(p, o)).toEqual(HEADING_DOWN);
    });

    it("returns LEFT when p is to the left of o", () => {
      const p = pointFrom<GlobalPoint>(-10, 0);
      const o = pointFrom<GlobalPoint>(0, 0);
      expect(headingForPoint(p, o)).toEqual(HEADING_LEFT);
    });

    it("returns UP when p is above o", () => {
      const p = pointFrom<GlobalPoint>(0, -10);
      const o = pointFrom<GlobalPoint>(0, 0);
      expect(headingForPoint(p, o)).toEqual(HEADING_UP);
    });
  });

  describe("headingForPointIsHorizontal", () => {
    it("returns true when heading is horizontal", () => {
      const p = pointFrom<GlobalPoint>(10, 1);
      const o = pointFrom<GlobalPoint>(0, 0);
      expect(headingForPointIsHorizontal(p, o)).toBe(true);
    });

    it("returns false when heading is vertical", () => {
      const p = pointFrom<GlobalPoint>(1, 10);
      const o = pointFrom<GlobalPoint>(0, 0);
      expect(headingForPointIsHorizontal(p, o)).toBe(false);
    });
  });

  describe("headingForPointFromElement", () => {
    const rectElement = {
      type: "rectangle",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      angle: 0,
    };
    const aabb: Bounds = [0, 0, 100, 100];

    it("returns HEADING_UP for point above element", () => {
      const p = pointFrom<GlobalPoint>(50, -20);
      expect(headingForPointFromElement(rectElement, aabb, p)).toEqual(HEADING_UP);
    });

    it("returns HEADING_RIGHT for point to the right", () => {
      const p = pointFrom<GlobalPoint>(150, 50);
      expect(headingForPointFromElement(rectElement, aabb, p)).toEqual(HEADING_RIGHT);
    });

    it("returns HEADING_DOWN for point below element", () => {
      const p = pointFrom<GlobalPoint>(50, 150);
      expect(headingForPointFromElement(rectElement, aabb, p)).toEqual(HEADING_DOWN);
    });

    it("returns HEADING_LEFT for point to the left", () => {
      const p = pointFrom<GlobalPoint>(-20, 50);
      expect(headingForPointFromElement(rectElement, aabb, p)).toEqual(HEADING_LEFT);
    });

    it("handles diamond element type", () => {
      const diamondElement = {
        type: "diamond",
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        angle: 0,
      };
      const p = pointFrom<GlobalPoint>(150, 50);
      const heading = headingForPointFromElement(diamondElement, aabb, p);
      expect(heading).toEqual(HEADING_RIGHT);
    });

    it("handles off-center AABB", () => {
      const elem = {
        type: "rectangle",
        x: 200,
        y: 200,
        width: 100,
        height: 100,
        angle: 0,
      };
      const bounds: Bounds = [200, 200, 300, 300];
      // Point within the right search cone (inside the expanded triangle)
      const p = pointFrom<GlobalPoint>(320, 250);
      expect(headingForPointFromElement(elem, bounds, p)).toEqual(HEADING_RIGHT);
    });
  });
});
