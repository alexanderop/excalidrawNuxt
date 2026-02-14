import { describe, it, expect } from "vitest";
import { createTestElement } from "../../__test-utils__/factories/element";
import { createTestPoint } from "../../__test-utils__/factories/point";
import { getTransformHandles, getTransformHandleAtPosition } from "./transformHandles";

describe("getTransformHandles", () => {
  it("returns all 8 handles + rotation for large element", () => {
    const el = createTestElement({ x: 0, y: 0, width: 200, height: 200 });
    const handles = getTransformHandles(el, 1);
    expect(Object.keys(handles)).toEqual(
      expect.arrayContaining(["nw", "ne", "sw", "se", "n", "s", "e", "w", "rotation"]),
    );
  });

  it("omits side handles for small elements", () => {
    const el = createTestElement({ x: 0, y: 0, width: 20, height: 20 });
    const handles = getTransformHandles(el, 1);
    expect(handles.n).toBeUndefined();
    expect(handles.s).toBeUndefined();
    expect(handles.e).toBeUndefined();
    expect(handles.w).toBeUndefined();
    expect(handles.se).toBeDefined();
  });

  it("always includes corner handles", () => {
    const el = createTestElement({ x: 0, y: 0, width: 5, height: 5 });
    const handles = getTransformHandles(el, 1);
    expect(handles.nw).toBeDefined();
    expect(handles.ne).toBeDefined();
    expect(handles.sw).toBeDefined();
    expect(handles.se).toBeDefined();
  });

  it("always includes rotation handle", () => {
    const el = createTestElement({ x: 0, y: 0, width: 50, height: 50 });
    const handles = getTransformHandles(el, 1);
    expect(handles.rotation).toBeDefined();
  });

  it("scales handle size inversely with zoom", () => {
    const el = createTestElement({ x: 0, y: 0, width: 200, height: 200 });
    const handles1 = getTransformHandles(el, 1);
    const handles2 = getTransformHandles(el, 2);
    // At zoom 2, handles should be half the scene-space size
    expect(handles1.se![2]).toBe(handles2.se![2] * 2);
  });
});

describe("getTransformHandleAtPosition", () => {
  it("detects pointer inside SE handle", () => {
    const el = createTestElement({ x: 0, y: 0, width: 100, height: 100 });
    const handles = getTransformHandles(el, 1);
    const se = handles.se!;
    const seCenter = createTestPoint(se[0] + se[2] / 2, se[1] + se[3] / 2);
    expect(getTransformHandleAtPosition(seCenter, el, 1)).toBe("se");
  });

  it("returns null when not on any handle", () => {
    const el = createTestElement({ x: 0, y: 0, width: 100, height: 100 });
    expect(getTransformHandleAtPosition(createTestPoint(50, 50), el, 1)).toBeNull();
  });

  it("detects rotation handle", () => {
    const el = createTestElement({ x: 0, y: 0, width: 100, height: 100 });
    const handles = getTransformHandles(el, 1);
    const rot = handles.rotation!;
    const rotCenter = createTestPoint(rot[0] + rot[2] / 2, rot[1] + rot[3] / 2);
    expect(getTransformHandleAtPosition(rotCenter, el, 1)).toBe("rotation");
  });
});
