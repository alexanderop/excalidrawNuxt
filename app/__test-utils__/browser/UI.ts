import type { RenderResult } from "vitest-browser-vue";
import type { ExcalidrawElement } from "~/features/elements/types";
import { Pointer } from "./Pointer";
import { Keyboard } from "./Keyboard";
import { CanvasGrid } from "./CanvasGrid";
import type { Cell } from "./CanvasGrid";
import { API } from "./api";
import { waitForPaint } from "./waiters";

const TOOL_SHORTCUTS: Record<string, string> = {
  selection: "1",
  rectangle: "2",
  diamond: "3",
  ellipse: "4",
  arrow: "a",
  line: "l",
  text: "t",
};

export class UI {
  readonly pointer = new Pointer();
  readonly keyboard = new Keyboard();
  readonly grid = new CanvasGrid();

  constructor(private screen: RenderResult<Record<string, unknown>>) {}

  async clickTool(name: string): Promise<void> {
    const shortcut = TOOL_SHORTCUTS[name];
    if (!shortcut) throw new Error(`Unknown tool: ${name}`);
    await this.keyboard.press(shortcut);
  }

  async createElementRaw(
    tool: string,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ): Promise<void> {
    await this.clickTool(tool);
    await this.pointer.drag(x1, y1, x2, y2);
  }

  async createElementAtCells(tool: string, start: Cell, end: Cell): Promise<void> {
    await this.clickTool(tool);
    await this.grid.drag(start, end);
  }

  /** Draw an element and return a live accessor to it. */
  async createElement(
    tool: string,
    start: Cell,
    end: Cell,
  ): Promise<{ get: () => ExcalidrawElement; id: string }> {
    const beforeCount = API.elements.length;
    await this.createElementAtCells(tool, start, end);
    await waitForPaint();

    const el = API.elements.at(-1);
    if (!el || API.elements.length <= beforeCount) {
      throw new Error(`createElement(${tool}) did not produce an element`);
    }

    return {
      id: el.id,
      get: () => API.getElementByID(el.id) ?? el,
    };
  }

  async selectElement(element: ExcalidrawElement): Promise<void> {
    await this.pointer.clickOn(element);
  }

  async group(): Promise<void> {
    await this.keyboard.withModifierKeys({ ctrlKey: true }, async () => {
      await this.keyboard.press("g");
    });
  }

  async ungroup(): Promise<void> {
    await this.keyboard.withModifierKeys({ ctrlKey: true, shiftKey: true }, async () => {
      await this.keyboard.press("g");
    });
  }

  async deleteSelected(): Promise<void> {
    await this.keyboard.press("{Delete}");
  }

  async expectToolActive(name: string): Promise<void> {
    const btn = this.screen.getByRole("button", {
      name: name.charAt(0).toUpperCase() + name.slice(1),
    });
    await expect.element(btn).toHaveAttribute("aria-pressed", "true");
  }
}
