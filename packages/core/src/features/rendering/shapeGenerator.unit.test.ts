import { pointFrom } from "../../shared/math";
import type { LocalPoint } from "../../shared/math";
import { generateShape, clearShapeCache, getZoomBucket, adjustRoughness } from "./shapeGenerator";
import { createTestElement, createTestArrowElement } from "../../__test-utils__/factories/element";

describe("shapeGenerator", () => {
  describe("generateShape", () => {
    it("generates a drawable for a rectangle", () => {
      clearShapeCache();
      const element = createTestElement({ type: "rectangle" });
      const drawable = generateShape(element, "light");

      expect(drawable).toBeDefined();
      expect(drawable.shape).toBe("rectangle");
      expect(drawable.sets.length).toBeGreaterThan(0);
    });

    it("generates a drawable for an ellipse", () => {
      clearShapeCache();
      const element = createTestElement({ type: "ellipse" });
      const drawable = generateShape(element, "light");

      expect(drawable).toBeDefined();
      expect(drawable.shape).toBe("ellipse");
      expect(drawable.sets.length).toBeGreaterThan(0);
    });

    it("generates a drawable for a diamond", () => {
      clearShapeCache();
      const element = createTestElement({ type: "diamond" });
      const drawable = generateShape(element, "light");

      expect(drawable).toBeDefined();
      expect(drawable.shape).toBe("polygon");
      expect(drawable.sets.length).toBeGreaterThan(0);
    });

    it("passes seed to rough options", () => {
      clearShapeCache();
      const element = createTestElement({ seed: 99_999 });
      const drawable = generateShape(element, "light");

      expect(drawable.options.seed).toBe(99_999);
    });

    it("passes stroke color to rough options", () => {
      clearShapeCache();
      const element = createTestElement({ strokeColor: "#ff0000" });
      const drawable = generateShape(element, "light");

      expect(drawable.options.stroke).toBe("#ff0000");
    });

    it("passes fill when backgroundColor is not transparent", () => {
      clearShapeCache();
      const element = createTestElement({ backgroundColor: "#00ff00" });
      const drawable = generateShape(element, "light");

      expect(drawable.options.fill).toBe("#00ff00");
    });

    it("does not pass fill when backgroundColor is transparent", () => {
      clearShapeCache();
      const element = createTestElement({ backgroundColor: "transparent" });
      const drawable = generateShape(element, "light");

      expect(drawable.options.fill).toBeUndefined();
    });

    it("passes strokeWidth and roughness", () => {
      clearShapeCache();
      const element = createTestElement({ strokeWidth: 4, roughness: 2 });
      const drawable = generateShape(element, "light");

      expect(drawable.options.strokeWidth).toBe(4);
      expect(drawable.options.roughness).toBe(2);
    });

    it("passes fillStyle to rough options", () => {
      clearShapeCache();
      const element = createTestElement({ fillStyle: "cross-hatch" });
      const drawable = generateShape(element, "light");

      expect(drawable.options.fillStyle).toBe("cross-hatch");
    });
  });

  describe("arrow shape generation", () => {
    it("generates a curve drawable for a rounded arrow", () => {
      clearShapeCache();
      const element = createTestArrowElement({ roundness: { type: 2 } });
      const drawable = generateShape(element as Parameters<typeof generateShape>[0], "light");
      expect(drawable.shape).toBe("curve");
    });

    it("generates a linearPath drawable for a sharp arrow", () => {
      clearShapeCache();
      const element = createTestArrowElement({ roundness: null });
      const drawable = generateShape(element as Parameters<typeof generateShape>[0], "light");
      expect(drawable.shape).toBe("linearPath");
    });

    it("generates a path drawable for an elbow arrow", () => {
      clearShapeCache();
      const element = createTestArrowElement({
        elbowed: true,
        roundness: null,
        points: [
          pointFrom<LocalPoint>(0, 0),
          pointFrom<LocalPoint>(50, 0),
          pointFrom<LocalPoint>(50, 50),
          pointFrom<LocalPoint>(100, 50),
        ] as readonly LocalPoint[],
      });
      const drawable = generateShape(element as Parameters<typeof generateShape>[0], "light");
      expect(drawable.shape).toBe("path");
    });
  });

  describe("stroke styles", () => {
    it("applies dashed stroke style with correct dash array", () => {
      clearShapeCache();
      const element = createTestElement({ strokeStyle: "dashed", strokeWidth: 2 });
      const drawable = generateShape(element, "light");

      expect(drawable.options.strokeLineDash).toEqual([8, 10]); // [8, 8 + 2]
      expect(drawable.options.disableMultiStroke).toBe(true);
      expect(drawable.options.strokeWidth).toBe(2.5); // 2 + 0.5
    });

    it("applies dotted stroke style with correct dash array", () => {
      clearShapeCache();
      const element = createTestElement({ strokeStyle: "dotted", strokeWidth: 2 });
      const drawable = generateShape(element, "light");

      expect(drawable.options.strokeLineDash).toEqual([1.5, 8]); // [1.5, 6 + 2]
      expect(drawable.options.disableMultiStroke).toBe(true);
      expect(drawable.options.strokeWidth).toBe(2.5);
    });

    it("does not apply dash for solid stroke style", () => {
      clearShapeCache();
      const element = createTestElement({ strokeStyle: "solid" });
      const drawable = generateShape(element, "light");

      expect(drawable.options.strokeLineDash).toBeUndefined();
      expect(drawable.options.disableMultiStroke).toBeFalsy();
    });
  });

  describe("caching", () => {
    it("caches drawable by element id and nonce", () => {
      clearShapeCache();
      const element = createTestElement();
      const first = generateShape(element, "light");
      const second = generateShape(element, "light");

      expect(first).toBe(second);
    });

    it("invalidates cache when versionNonce changes", () => {
      clearShapeCache();
      const element = createTestElement({ versionNonce: 1 });
      const first = generateShape(element, "light");

      const updated = createTestElement({ versionNonce: 2 });
      const second = generateShape(updated, "light");

      expect(first).not.toBe(second);
    });

    it("caches independently per element id", () => {
      clearShapeCache();
      const elementA = createTestElement({ id: "a" });
      const elementB = createTestElement({ id: "b" });

      const drawableA = generateShape(elementA, "light");
      const drawableB = generateShape(elementB, "light");

      expect(drawableA).not.toBe(drawableB);
    });

    it("clears all cached entries with clearShapeCache", () => {
      clearShapeCache();
      const element = createTestElement();
      const first = generateShape(element, "light");

      clearShapeCache();

      const second = generateShape(element, "light");
      expect(first).not.toBe(second);
    });

    it("produces different cache entries for different zoom buckets", () => {
      clearShapeCache();
      const element = createTestElement();
      const atLowZoom = generateShape(element, "light", 0.3);
      const atMidZoom = generateShape(element, "light", 0.8);

      expect(atLowZoom).not.toBe(atMidZoom);
    });

    it("uses same cache entry for zooms in the same bucket", () => {
      clearShapeCache();
      const element = createTestElement();
      const first = generateShape(element, "light", 0.3);
      const second = generateShape(element, "light", 0.4);

      expect(first).toBe(second);
    });
  });

  describe("getZoomBucket", () => {
    it("returns bucket 0 for zoom <= 0.5", () => {
      expect(getZoomBucket(0.1)).toBe(0);
      expect(getZoomBucket(0.5)).toBe(0);
    });

    it("returns bucket 1 for zoom > 0.5 and <= 1", () => {
      expect(getZoomBucket(0.6)).toBe(1);
      expect(getZoomBucket(1)).toBe(1);
    });

    it("returns bucket 2 for zoom > 1 and <= 2", () => {
      expect(getZoomBucket(1.5)).toBe(2);
      expect(getZoomBucket(2)).toBe(2);
    });

    it("returns bucket 3 for zoom > 2", () => {
      expect(getZoomBucket(2.1)).toBe(3);
      expect(getZoomBucket(5)).toBe(3);
    });
  });

  describe("adjustRoughness", () => {
    it("returns half roughness for elements smaller than 30", () => {
      expect(adjustRoughness(2, 20)).toBe(1);
      expect(adjustRoughness(4, 10)).toBe(2);
    });

    it("returns 75% roughness for elements between 30 and 60", () => {
      expect(adjustRoughness(2, 40)).toBe(1.5);
      expect(adjustRoughness(4, 50)).toBe(3);
    });

    it("returns full roughness for elements 60 or larger", () => {
      expect(adjustRoughness(2, 60)).toBe(2);
      expect(adjustRoughness(2, 100)).toBe(2);
    });
  });

  describe("preserveVertices", () => {
    it("sets preserveVertices to true when roughness is less than 2", () => {
      clearShapeCache();
      const element = createTestElement({ roughness: 1 });
      const drawable = generateShape(element, "light");

      expect(drawable.options.preserveVertices).toBe(true);
    });

    it("does not set preserveVertices when roughness is 2 or greater", () => {
      clearShapeCache();
      const element = createTestElement({ roughness: 2 });
      const drawable = generateShape(element, "light");

      expect(drawable.options.preserveVertices).toBeFalsy();
    });
  });
});
