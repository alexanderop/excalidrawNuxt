import type { ExcalidrawElement, ExcalidrawArrowElement } from "./types";
import { createElement } from "./createElement";
import { mutateElement } from "./mutateElement";
import { snapshotElement } from "../../__test-utils__/serializers/elementSerializer";
import { createTestElement } from "../../__test-utils__/factories/element";

function assertIsArrow(el: ExcalidrawElement): asserts el is ExcalidrawArrowElement {
  expect(el.type).toBe("arrow");
}

describe("element creation snapshots", () => {
  it("creates rectangle with correct defaults", () => {
    const el = createElement("rectangle", 10, 20);
    const snap = snapshotElement(el);
    expect(snap).toMatchObject({
      type: "rectangle",
      x: 10,
      y: 20,
      width: 0,
      height: 0,
      angle: 0,
      strokeColor: "#1e1e1e",
      backgroundColor: "transparent",
      fillStyle: "hachure",
      strokeWidth: 2,
      roughness: 1,
      opacity: 100,
      isDeleted: false,
      boundElements: null,
      groupIds: [],
    });
    // id should be a non-empty string
    expect(el.id).toBeTruthy();
  });

  it("creates ellipse with correct type", () => {
    const el = createElement("ellipse", 0, 0);
    expect(el.type).toBe("ellipse");
  });

  it("creates diamond with correct type", () => {
    const el = createElement("diamond", 0, 0);
    expect(el.type).toBe("diamond");
  });

  it("creates arrow with arrow-specific defaults", () => {
    const el = createElement("arrow", 5, 10);
    assertIsArrow(el);
    expect(el.points).toEqual([[0, 0]]);
    expect(el.startArrowhead).toBeNull();
    expect(el.endArrowhead).toBe("arrow");
    expect(el.startBinding).toBeNull();
    expect(el.endBinding).toBeNull();
  });
});

describe("element mutation snapshots", () => {
  it("mutates position", () => {
    const el = createTestElement({ x: 0, y: 0 });
    mutateElement(el, { x: 50, y: 100 });
    expect(el.x).toBe(50);
    expect(el.y).toBe(100);
  });

  it("mutates size", () => {
    const el = createTestElement({ width: 100, height: 50 });
    mutateElement(el, { width: 200, height: 150 });
    expect(el.width).toBe(200);
    expect(el.height).toBe(150);
  });

  it("mutates colors", () => {
    const el = createTestElement({ strokeColor: "#000", backgroundColor: "transparent" });
    mutateElement(el, { strokeColor: "#ff0000", backgroundColor: "#00ff00" });
    expect(el.strokeColor).toBe("#ff0000");
    expect(el.backgroundColor).toBe("#00ff00");
  });

  it("bumps versionNonce on every mutation", () => {
    const el = createTestElement({ versionNonce: 42 });
    mutateElement(el, { x: 10 });
    const firstNonce = el.versionNonce;
    expect(firstNonce).not.toBe(42);

    mutateElement(el, { y: 20 });
    expect(el.versionNonce).not.toBe(firstNonce);
  });
});
