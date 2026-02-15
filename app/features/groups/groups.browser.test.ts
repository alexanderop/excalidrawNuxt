/* eslint-disable vitest/expect-expect -- TestDrawVue assertion methods wrap expect() */
import { TestDrawVue, waitForPaint } from "~/__test-utils__/browser";

describe("groups", () => {
  it("Ctrl+G groups two selected elements with a shared groupId", async () => {
    const td = await TestDrawVue.create();

    const el1 = td.addElement({ x: 50, y: 50, width: 100, height: 100 });
    const el2 = td.addElement({ x: 250, y: 50, width: 100, height: 100 });
    await td.flush();

    td.select(el1, el2);
    await td.group();
    await td.flush();

    const updated1 = td.getElement(el1.id);
    const updated2 = td.getElement(el2.id);

    expect(updated1.groupIds.length).toBeGreaterThan(0);
    expect(updated2.groupIds.length).toBeGreaterThan(0);
    expect(updated1.groupIds).toEqual(updated2.groupIds);
  });

  it("Ctrl+Shift+G ungroups elements and clears groupIds", async () => {
    const td = await TestDrawVue.create();

    const el1 = td.addElement({ x: 50, y: 50, width: 100, height: 100 });
    const el2 = td.addElement({ x: 250, y: 50, width: 100, height: 100 });
    await td.flush();

    td.select(el1, el2);
    await td.group();
    await td.flush();

    // Verify grouped
    expect(td.getElement(el1.id).groupIds.length).toBeGreaterThan(0);

    await td.ungroup();
    await td.flush();

    expect(td.getElement(el1.id).groupIds).toHaveLength(0);
    expect(td.getElement(el2.id).groupIds).toHaveLength(0);
  });

  it("clicking one grouped element selects the entire group", async () => {
    const td = await TestDrawVue.create();

    const el1 = td.addElement({ x: 50, y: 50, width: 100, height: 100 });
    const el2 = td.addElement({ x: 250, y: 50, width: 100, height: 100 });
    await td.flush();

    td.select(el1, el2);
    await td.group();
    td.clearSelection();
    await td.flush();

    td.setTool("selection");
    await td.clickElement(el1);
    await waitForPaint();

    td.expectSelected(el1.id, el2.id);
  });

  it("moving a grouped element moves all group members", async () => {
    const td = await TestDrawVue.create();

    const el1 = td.addElement({ x: 50, y: 50, width: 100, height: 100 });
    const el2 = td.addElement({ x: 250, y: 50, width: 100, height: 100 });
    await td.flush();

    td.select(el1, el2);
    await td.group();
    await td.flush();

    td.setTool("selection");

    // Drag from center of el1 by 60px right and 60px down
    const cx = el1.x + el1.width / 2;
    const cy = el1.y + el1.height / 2;
    await td.pointer.drag(cx, cy, cx + 60, cy + 60);
    await waitForPaint();

    const moved1 = td.getElement(el1.id);
    const moved2 = td.getElement(el2.id);

    // Both elements should have moved by the same delta
    expect(moved1.x).toBeCloseTo(el1.x + 60, -1);
    expect(moved1.y).toBeCloseTo(el1.y + 60, -1);
    expect(moved2.x).toBeCloseTo(el2.x + 60, -1);
    expect(moved2.y).toBeCloseTo(el2.y + 60, -1);
  });

  it("deleting a grouped element deletes all group members", async () => {
    const td = await TestDrawVue.create();

    const el1 = td.addElement({ x: 50, y: 50, width: 100, height: 100 });
    const el2 = td.addElement({ x: 250, y: 50, width: 100, height: 100 });
    await td.flush();

    td.select(el1, el2);
    await td.group();
    td.clearSelection();
    await td.flush();

    // Click one element to select the whole group
    td.setTool("selection");
    await td.clickElement(el1);
    await waitForPaint();

    td.expectSelected(el1.id, el2.id);

    await td.deleteSelected();
    await waitForPaint();

    expect(td.getElement(el1.id).isDeleted).toBe(true);
    expect(td.getElement(el2.id).isDeleted).toBe(true);
  });

  it("grouping requires at least two selected elements", async () => {
    const td = await TestDrawVue.create();

    const el1 = td.addElement({ x: 50, y: 50, width: 100, height: 100 });
    await td.flush();

    td.select(el1);
    await td.group();
    await td.flush();

    // Single element should not get a groupId
    expect(td.getElement(el1.id).groupIds).toHaveLength(0);
  });
});
