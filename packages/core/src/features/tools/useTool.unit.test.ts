import { withDrawVue } from "../../__test-utils__/withDrawVue";

describe("useToolStore", () => {
  it("defaults activeTool to selection", () => {
    using ctx = withDrawVue(() => ({}));
    expect(ctx.drawVue.tool.activeTool.value).toBe("selection");
  });

  it("sets activeTool via setTool", () => {
    using ctx = withDrawVue(() => ({}));
    ctx.drawVue.tool.setTool("rectangle");
    expect(ctx.drawVue.tool.activeTool.value).toBe("rectangle");
  });

  it("sets activeTool to each tool type", () => {
    using ctx = withDrawVue(() => ({}));
    const tools = ["selection", "hand", "rectangle", "ellipse", "diamond"] as const;

    for (const t of tools) {
      ctx.drawVue.tool.setTool(t);
      expect(ctx.drawVue.tool.activeTool.value).toBe(t);
    }
  });

  it("fires onBeforeToolChange before setting the tool", () => {
    using ctx = withDrawVue(() => ({}));
    const captured: string[] = [];

    ctx.drawVue.tool.onBeforeToolChange(() => {
      captured.push(ctx.drawVue.tool.activeTool.value);
    });

    ctx.drawVue.tool.setTool("rectangle");

    expect(captured).toEqual(["selection"]);
    expect(ctx.drawVue.tool.activeTool.value).toBe("rectangle");
  });
});
