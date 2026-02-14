import { generateShape, clearShapeCache } from "./shapeGenerator";
import { createTestElement } from "../../__test-utils__/factories/element";

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
  });
});
