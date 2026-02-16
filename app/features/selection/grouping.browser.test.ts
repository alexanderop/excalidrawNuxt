import { TestDrawVue, waitForPaint } from "~/__test-utils__/browser";

describe("grouping elements", () => {
  it("groups two elements via Ctrl+G", async () => {
    const td = await TestDrawVue.create();

    const r1 = await td.createElement("rectangle", [2, 2], [4, 4]);
    const r2 = await td.createElement("rectangle", [6, 2], [8, 4]);

    await td.selectElements(r1.get(), r2.get());
    await td.group();
    await td.flush();

    const el1 = td.getElement(r1.id);
    const el2 = td.getElement(r2.id);
    expect(el1.groupIds).toHaveLength(1);
    expect(el2.groupIds).toHaveLength(1);
    expect(el1.groupIds[0]).toBe(el2.groupIds[0]);
  });

  // eslint-disable-next-line vitest/expect-expect -- td.expectSelected/expectNoneSelected wrap expect()
  it("clicking one grouped element selects all in the group", async () => {
    const td = await TestDrawVue.create();

    const r1 = await td.createElement("rectangle", [2, 2], [4, 4]);
    const r2 = await td.createElement("rectangle", [6, 2], [8, 4]);

    await td.selectElements(r1.get(), r2.get());
    await td.group();
    await td.flush();

    // Click on empty area to deselect
    await td.click([12, 8]);
    await waitForPaint();
    td.expectNoneSelected();

    // Click on first element — group should select both
    await td.clickElement(td.getElement(r1.id));
    await waitForPaint();

    td.expectSelected(r1.id, r2.id);
  });

  it("ungroups via Ctrl+Shift+G", async () => {
    const td = await TestDrawVue.create();

    const r1 = await td.createElement("rectangle", [2, 2], [4, 4]);
    const r2 = await td.createElement("rectangle", [6, 2], [8, 4]);

    await td.selectElements(r1.get(), r2.get());
    await td.group();
    await td.flush();

    // Ungroup
    await td.ungroup();
    await td.flush();

    const el1 = td.getElement(r1.id);
    const el2 = td.getElement(r2.id);
    expect(el1.groupIds).toHaveLength(0);
    expect(el2.groupIds).toHaveLength(0);

    // After ungroup, clicking one should only select one
    await td.click([12, 8]);
    await waitForPaint();

    await td.clickElement(td.getElement(r1.id));
    await waitForPaint();

    const selected = td.selectedIds;
    expect(selected).toContain(r1.id);
    expect(selected).not.toContain(r2.id);
  });

  it("drag moves entire group", async () => {
    const td = await TestDrawVue.create();

    const r1 = await td.createElement("rectangle", [2, 2], [4, 4]);
    const r2 = await td.createElement("rectangle", [6, 2], [8, 4]);

    await td.selectElements(r1.get(), r2.get());
    await td.group();
    await td.flush();

    const el1Before = td.getElement(r1.id);
    const el2Before = td.getElement(r2.id);
    const x1Before = el1Before.x;
    const y1Before = el1Before.y;
    const x2Before = el2Before.x;
    const y2Before = el2Before.y;

    // Click on first element then drag — should move both
    await td.clickElement(td.getElement(r1.id));
    await waitForPaint();

    // Drag from center of r1 area to a new position
    await td.drag([3, 3], [5, 5]);
    await waitForPaint();

    const el1After = td.getElement(r1.id);
    const el2After = td.getElement(r2.id);

    // Both elements should have moved by the same delta
    const dx1 = el1After.x - x1Before;
    const dy1 = el1After.y - y1Before;
    const dx2 = el2After.x - x2Before;
    const dy2 = el2After.y - y2Before;

    expect(dx1).not.toBe(0);
    expect(dy1).not.toBe(0);
    expect(dx1).toBeCloseTo(dx2, 0);
    expect(dy1).toBeCloseTo(dy2, 0);
  });

  it("group then ungroup restores original state", async () => {
    const td = await TestDrawVue.create();

    const r1 = await td.createElement("rectangle", [2, 2], [4, 4]);
    const r2 = await td.createElement("rectangle", [6, 2], [8, 4]);

    await td.selectElements(r1.get(), r2.get());
    await td.group();
    await td.flush();

    expect(td.getElement(r1.id).groupIds).toHaveLength(1);
    expect(td.getElement(r2.id).groupIds).toHaveLength(1);

    // Ungroup restores original state
    await td.ungroup();
    await td.flush();

    expect(td.getElement(r1.id).groupIds).toHaveLength(0);
    expect(td.getElement(r2.id).groupIds).toHaveLength(0);
  });

  it("cannot group a single element", async () => {
    const td = await TestDrawVue.create();

    const r1 = await td.createElement("rectangle", [2, 2], [4, 4]);
    td.expectSelected(r1.id);

    await td.group();
    await td.flush();

    const el = td.getElement(r1.id);
    expect(el.groupIds).toHaveLength(0);
  });
});
