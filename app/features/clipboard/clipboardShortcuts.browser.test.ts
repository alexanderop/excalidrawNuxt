import type { ExcalidrawElement } from "@drawvue/core";
import { TestDrawVue, waitForPaint } from "~/__test-utils__/browser";

describe("clipboard shortcuts", () => {
  it("duplicates element with offset via Ctrl+D", async () => {
    const td = await TestDrawVue.create();

    const el = await td.createElement("rectangle", [2, 2], [5, 5]);
    td.expectElementCount(1);

    await td.withModifiers({ ctrlKey: true }, async () => {
      await td.keyPress("d");
    });
    await waitForPaint();

    td.expectElementCount(2);
    const dupe = td.elements.find((e) => e.id !== el.id && !e.isDeleted)!;
    expect(dupe).toBeDefined();
    expect(dupe.type).toBe("rectangle");

    const orig = el.get();
    const samePosition = dupe.x === orig.x && dupe.y === orig.y;
    expect(samePosition).toBe(false);
  });

  it("cuts multiple elements removing all of them", async () => {
    const td = await TestDrawVue.create();

    const [el1, el2] = td.addElements(
      { x: 50, y: 50, width: 100, height: 100 },
      { x: 250, y: 50, width: 100, height: 100 },
    ) as [ExcalidrawElement, ExcalidrawElement];
    td.select(el1, el2);
    await td.flush();

    await td.withModifiers({ ctrlKey: true }, async () => {
      await td.keyPress("x");
    });
    await waitForPaint();

    const visible = td.elements.filter((e) => !e.isDeleted);
    expect(visible).toHaveLength(0);
  });

  it("multiple pastes create cascading offsets", async () => {
    const td = await TestDrawVue.create();

    await td.createElement("rectangle", [2, 2], [5, 5]);

    await td.withModifiers({ ctrlKey: true }, async () => {
      await td.keyPress("c");
    });

    await td.withModifiers({ ctrlKey: true }, async () => {
      await td.keyPress("v");
    });
    await waitForPaint();

    await td.withModifiers({ ctrlKey: true }, async () => {
      await td.keyPress("v");
    });
    await waitForPaint();

    td.expectElementCount(3);

    const positions = td.elements.filter((e) => !e.isDeleted).map((e) => `${e.x},${e.y}`);
    const unique = new Set(positions);
    expect(unique.size).toBe(3);
  });

  it("paste preserves element properties", async () => {
    const td = await TestDrawVue.create();

    const el = td.addElement({
      x: 50,
      y: 50,
      width: 100,
      height: 100,
      strokeColor: "#ff0000",
      strokeWidth: 4,
    });
    td.select(el);
    await td.flush();

    await td.withModifiers({ ctrlKey: true }, async () => {
      await td.keyPress("c");
    });

    await td.withModifiers({ ctrlKey: true }, async () => {
      await td.keyPress("v");
    });
    await waitForPaint();

    const pasted = td.elements.find((e) => e.id !== el.id && !e.isDeleted)!;
    expect(pasted).toBeDefined();
    expect(pasted.strokeColor).toBe("#ff0000");
    expect(pasted.strokeWidth).toBe(4);
  });
});
