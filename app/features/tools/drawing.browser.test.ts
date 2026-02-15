/* eslint-disable vitest/expect-expect -- TestDrawVue assertion methods wrap expect() */
import { TestDrawVue } from "~/__test-utils__/browser";

describe("drawing interaction", () => {
  it("creates a rectangle on drag", async () => {
    const td = await TestDrawVue.create();

    await td.createElementAtCells("rectangle", [2, 2], [5, 5]);

    td.expectElementCount(1);
    td.expectElementType(0, "rectangle");
    expect(td.elements[0]!.width).toBeGreaterThan(0);
    expect(td.elements[0]!.height).toBeGreaterThan(0);
    td.expectToolToBe("selection");
  });

  it("creates an ellipse on drag", async () => {
    const td = await TestDrawVue.create();

    await td.createElementAtCells("ellipse", [3, 1], [7, 4]);

    td.expectElementCount(1);
    td.expectElementType(0, "ellipse");
    td.expectToolToBe("selection");
  });

  it("creates a diamond on drag", async () => {
    const td = await TestDrawVue.create();

    await td.createElementAtCells("diamond", [1, 1], [4, 4]);

    td.expectElementCount(1);
    td.expectElementType(0, "diamond");
    td.expectToolToBe("selection");
  });

  it("creates an arrow on drag", async () => {
    const td = await TestDrawVue.create();

    await td.createElementAtCells("arrow", [1, 1], [8, 4]);

    td.expectElementCount(1);
    td.expectElementType(0, "arrow");
    td.expectToolToBe("selection");
  });

  it("switches to selection tool after drawing", async () => {
    const td = await TestDrawVue.create();

    await td.createElementAtCells("rectangle", [2, 2], [5, 5]);

    td.expectToolToBe("selection");
  });

  it("auto-selects the drawn element", async () => {
    const td = await TestDrawVue.create();

    await td.createElementAtCells("rectangle", [2, 2], [5, 5]);

    const drawn = td.elements[0]!;
    td.expectSelected(drawn.id);
  });

  it("draws multiple shapes in sequence", async () => {
    const td = await TestDrawVue.create();

    await td.createElementAtCells("rectangle", [1, 1], [3, 3]);
    await td.createElementAtCells("ellipse", [5, 1], [8, 4]);

    td.expectElementCount(2);
    td.expectElementType(0, "rectangle");
    td.expectElementType(1, "ellipse");
  });

  it("createElement returns a live accessor", async () => {
    const td = await TestDrawVue.create();

    const ref = await td.createElement("rectangle", [2, 2], [5, 5]);

    expect(ref.id).toBeTruthy();
    const el = ref.get();
    expect(el.type).toBe("rectangle");
    expect(el.width).toBeGreaterThan(0);
  });

  it("element has positive position and dimensions", async () => {
    const td = await TestDrawVue.create();

    await td.createElementAtCells("rectangle", [2, 2], [5, 5]);
    await td.flush();

    const el = td.elements[0]!;
    expect(el.x).toBeGreaterThan(0);
    expect(el.y).toBeGreaterThan(0);
    expect(el.width).toBeGreaterThan(0);
    expect(el.height).toBeGreaterThan(0);
  });
});
