import { describe, it, expect } from "vitest";
import {
  hasStrokeColor,
  hasBackground,
  hasFillStyle,
  hasStrokeWidth,
  hasStrokeStyle,
  hasRoughness,
  canChangeRoundness,
} from "./propertyPredicates";

/**
 * Property × Element Type matrix:
 *
 * | Property        | rect | ellipse | diamond | arrow | line | freedraw | text | image |
 * |-----------------|------|---------|---------|-------|------|----------|------|-------|
 * | strokeColor     |  Y   |    Y    |    Y    |   Y   |  Y   |    Y     |  Y   |   -   |
 * | background      |  Y   |    Y    |    Y    |   -   |  Y   |    Y     |  -   |   -   |
 * | fillStyle       |  Y   |    Y    |    Y    |   -   |  Y   |    Y     |  -   |   -   |
 * | strokeWidth     |  Y   |    Y    |    Y    |   Y   |  Y   |    Y     |  -   |   -   |
 * | strokeStyle     |  Y   |    Y    |    Y    |   Y   |  Y   |    Y     |  -   |   -   |
 * | roughness       |  Y   |    Y    |    Y    |   Y   |  Y   |    Y     |  -   |   -   |
 * | roundness       |  Y   |    -    |    Y    |   -   |  Y   |    -     |  -   |   Y   |
 */

const ALL_TYPES = [
  "rectangle",
  "ellipse",
  "diamond",
  "arrow",
  "line",
  "freedraw",
  "text",
  "image",
] as const;

describe("propertyPredicates", () => {
  describe("hasStrokeColor", () => {
    const expected = new Set([
      "rectangle",
      "ellipse",
      "diamond",
      "arrow",
      "line",
      "freedraw",
      "text",
    ]);

    it.each(ALL_TYPES)("%s → %s", (type) => {
      expect(hasStrokeColor(type)).toBe(expected.has(type));
    });
  });

  describe("hasBackground", () => {
    const expected = new Set(["rectangle", "ellipse", "diamond", "line", "freedraw"]);

    it.each(ALL_TYPES)("%s → %s", (type) => {
      expect(hasBackground(type)).toBe(expected.has(type));
    });
  });

  describe("hasFillStyle", () => {
    const expected = new Set(["rectangle", "ellipse", "diamond", "line", "freedraw"]);

    it.each(ALL_TYPES)("%s → %s", (type) => {
      expect(hasFillStyle(type)).toBe(expected.has(type));
    });
  });

  describe("hasStrokeWidth", () => {
    const expected = new Set(["rectangle", "ellipse", "diamond", "arrow", "line", "freedraw"]);

    it.each(ALL_TYPES)("%s → %s", (type) => {
      expect(hasStrokeWidth(type)).toBe(expected.has(type));
    });
  });

  describe("hasStrokeStyle", () => {
    const expected = new Set(["rectangle", "ellipse", "diamond", "arrow", "line", "freedraw"]);

    it.each(ALL_TYPES)("%s → %s", (type) => {
      expect(hasStrokeStyle(type)).toBe(expected.has(type));
    });
  });

  describe("hasRoughness", () => {
    const expected = new Set(["rectangle", "ellipse", "diamond", "arrow", "line", "freedraw"]);

    it.each(ALL_TYPES)("%s → %s", (type) => {
      expect(hasRoughness(type)).toBe(expected.has(type));
    });
  });

  describe("canChangeRoundness", () => {
    const expected = new Set(["rectangle", "diamond", "line", "image"]);

    it.each(ALL_TYPES)("%s → %s", (type) => {
      expect(canChangeRoundness(type)).toBe(expected.has(type));
    });
  });

  it("returns false for unknown types", () => {
    expect(hasStrokeColor("unknown")).toBe(false);
    expect(hasBackground("unknown")).toBe(false);
    expect(hasFillStyle("unknown")).toBe(false);
    expect(hasStrokeWidth("unknown")).toBe(false);
    expect(hasStrokeStyle("unknown")).toBe(false);
    expect(hasRoughness("unknown")).toBe(false);
    expect(canChangeRoundness("unknown")).toBe(false);
  });
});
