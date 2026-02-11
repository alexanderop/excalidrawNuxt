import type { RenderResult } from "vitest-browser-vue";
import { Keyboard } from "../Keyboard";

const TOOL_SHORTCUTS: Record<string, string> = {
  selection: "1",
  rectangle: "2",
  diamond: "3",
  ellipse: "4",
  arrow: "a",
  line: "l",
  text: "t",
  hand: "h",
  code: "c",
};

export class ToolbarPO {
  private readonly keyboard = new Keyboard();

  constructor(private screen: RenderResult<Record<string, unknown>>) {}

  async select(tool: string): Promise<void> {
    const shortcut = TOOL_SHORTCUTS[tool];
    if (!shortcut) throw new Error(`Unknown tool: ${tool}`);
    await this.keyboard.press(shortcut);
  }

  async expectActive(tool: string): Promise<void> {
    const btn = this.screen.getByRole("button", {
      name: tool.charAt(0).toUpperCase() + tool.slice(1),
    });
    await expect.element(btn).toHaveAttribute("aria-pressed", "true");
  }
}
