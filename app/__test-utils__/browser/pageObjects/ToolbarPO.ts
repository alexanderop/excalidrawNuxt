import type { RenderResult } from "vitest-browser-vue";
import { Keyboard } from "../Keyboard";

const TOOL_SHORTCUTS: Record<string, string> = {
  selection: "1",
  rectangle: "2",
  diamond: "3",
  ellipse: "4",
  arrow: "a",
  line: "l",
  freedraw: "p",
  text: "t",
  hand: "h",
  code: "c",
};

/** Maps tool keys to their toolbar aria-label when it differs from the capitalized key. */
const TOOL_LABELS: Record<string, string> = {
  freedraw: "Pencil",
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
    const label = TOOL_LABELS[tool] ?? tool.charAt(0).toUpperCase() + tool.slice(1);
    const btn = this.screen.getByRole("button", { name: label });
    await expect.element(btn).toHaveAttribute("aria-pressed", "true");
  }
}
