/* eslint-disable vitest/expect-expect -- TestDrawVue assertion methods wrap expect() */
import { TestDrawVue, waitForPaint } from "~/__test-utils__/browser";

describe("tool shortcuts", () => {
  it("keyboard shortcuts activate correct tools", async () => {
    const td = await TestDrawVue.create();

    await td.keyPress("2");
    td.expectToolToBe("rectangle");

    await td.keyPress("3");
    td.expectToolToBe("diamond");

    await td.keyPress("4");
    td.expectToolToBe("ellipse");

    await td.keyPress("a");
    td.expectToolToBe("arrow");

    await td.keyPress("l");
    td.expectToolToBe("line");

    await td.keyPress("p");
    td.expectToolToBe("freedraw");

    await td.keyPress("t");
    td.expectToolToBe("text");

    await td.keyPress("h");
    td.expectToolToBe("hand");

    await td.keyPress("c");
    td.expectToolToBe("code");

    await td.keyPress("1");
    td.expectToolToBe("selection");
  });

  it("line tool creates a line element", async () => {
    const td = await TestDrawVue.create();

    await td.selectTool("line");
    await td.drag([2, 2], [6, 5]);
    await waitForPaint();

    td.expectElementCount(1);
    td.expectElementType(0, "line");
  });

  it("escape returns to selection tool", async () => {
    const td = await TestDrawVue.create();

    await td.selectTool("rectangle");
    td.expectToolToBe("rectangle");

    await td.keyPress("{Escape}");
    td.expectToolToBe("selection");
  });

  it("escape returns to selection from any tool", async () => {
    const td = await TestDrawVue.create();

    await td.selectTool("ellipse");
    td.expectToolToBe("ellipse");
    await td.keyPress("{Escape}");
    td.expectToolToBe("selection");

    await td.selectTool("arrow");
    td.expectToolToBe("arrow");
    await td.keyPress("{Escape}");
    td.expectToolToBe("selection");

    await td.selectTool("line");
    td.expectToolToBe("line");
    await td.keyPress("{Escape}");
    td.expectToolToBe("selection");
  });

  it("tool resets to selection after drawing a shape", async () => {
    const td = await TestDrawVue.create();

    await td.createElementAtCells("rectangle", [1, 1], [4, 3]);
    td.expectToolToBe("selection");

    await td.createElementAtCells("diamond", [5, 1], [8, 3]);
    td.expectToolToBe("selection");

    await td.createElementAtCells("ellipse", [1, 5], [4, 7]);
    td.expectToolToBe("selection");

    td.expectElementCount(3);
  });
});
