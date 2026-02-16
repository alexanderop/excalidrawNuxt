import { TestDrawVue, waitForPaint, API } from "~/__test-utils__/browser";

describe("style copy and paste", () => {
  it("copies styles from element with Cmd+Alt+C and pastes with Cmd+Alt+V", async () => {
    const td = await TestDrawVue.create();

    // Create a rectangle with custom styles
    const source = td.addElement({
      x: 50,
      y: 50,
      width: 100,
      height: 100,
      strokeColor: "#ff0000",
      backgroundColor: "#00ff00",
      fillStyle: "solid",
      strokeWidth: 4,
    });

    // Create a second rectangle with default styles
    const target = td.addElement({
      x: 200,
      y: 50,
      width: 100,
      height: 100,
    });

    // Select source, copy styles
    td.select(source);
    await td.keyboard.withModifierKeys({ metaKey: true, altKey: true }, async () => {
      await td.keyPress("c");
    });

    // Select target, paste styles
    td.select(target);
    await td.keyboard.withModifierKeys({ metaKey: true, altKey: true }, async () => {
      await td.keyPress("v");
    });
    await waitForPaint();

    const updated = td.getElement(target.id);
    expect(updated.strokeColor).toBe("#ff0000");
    expect(updated.backgroundColor).toBe("#00ff00");
    expect(updated.fillStyle).toBe("solid");
    expect(updated.strokeWidth).toBe(4);
  });

  it("pastes styles to all selected elements", async () => {
    const td = await TestDrawVue.create();

    const source = td.addElement({
      x: 50,
      y: 50,
      width: 100,
      height: 100,
      strokeColor: "#0000ff",
      backgroundColor: "#ffff00",
    });

    const t1 = td.addElement({ x: 200, y: 50, width: 100, height: 100 });
    const t2 = td.addElement({ x: 350, y: 50, width: 100, height: 100 });

    // Copy styles from source
    td.select(source);
    await td.keyboard.withModifierKeys({ metaKey: true, altKey: true }, async () => {
      await td.keyPress("c");
    });

    // Select both targets, paste styles
    API.setSelectedElements([t1, t2]);
    await td.keyboard.withModifierKeys({ metaKey: true, altKey: true }, async () => {
      await td.keyPress("v");
    });
    await waitForPaint();

    expect(td.getElement(t1.id).strokeColor).toBe("#0000ff");
    expect(td.getElement(t1.id).backgroundColor).toBe("#ffff00");
    expect(td.getElement(t2.id).strokeColor).toBe("#0000ff");
    expect(td.getElement(t2.id).backgroundColor).toBe("#ffff00");
  });

  it("style paste is undoable", async () => {
    const td = await TestDrawVue.create();

    const source = td.addElement({
      x: 50,
      y: 50,
      width: 100,
      height: 100,
      strokeColor: "#ff0000",
    });

    const target = td.addElement({
      x: 200,
      y: 50,
      width: 100,
      height: 100,
      strokeColor: "#1e1e1e",
    });

    // Copy styles, paste to target
    td.select(source);
    await td.keyboard.withModifierKeys({ metaKey: true, altKey: true }, async () => {
      await td.keyPress("c");
    });

    td.select(target);
    await td.keyboard.withModifierKeys({ metaKey: true, altKey: true }, async () => {
      await td.keyPress("v");
    });
    await waitForPaint();

    expect(td.getElement(target.id).strokeColor).toBe("#ff0000");

    // Undo should revert the paste
    await td.undo();
    await waitForPaint();

    expect(td.getElement(target.id).strokeColor).toBe("#1e1e1e");
  });
});
