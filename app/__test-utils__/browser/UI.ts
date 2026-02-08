import type { RenderResult } from 'vitest-browser-vue'
import { Pointer } from './Pointer'
import { Keyboard } from './Keyboard'
import { CanvasGrid } from './CanvasGrid'
import type { Cell } from './CanvasGrid'

const TOOL_SHORTCUTS: Record<string, string> = {
  selection: '1',
  rectangle: '2',
  diamond: '3',
  ellipse: '4',
  arrow: 'a',
}

export class UI {
  readonly pointer = new Pointer()
  readonly keyboard = new Keyboard()
  readonly grid = new CanvasGrid()

  constructor(private screen: RenderResult<Record<string, unknown>>) {}

  async clickTool(name: string): Promise<void> {
    const shortcut = TOOL_SHORTCUTS[name]
    if (!shortcut) throw new Error(`Unknown tool: ${name}`)
    await this.keyboard.press(shortcut)
  }

  async createElement(tool: string, x1: number, y1: number, x2: number, y2: number): Promise<void> {
    await this.clickTool(tool)
    await this.pointer.drag(x1, y1, x2, y2)
  }

  async createElementAtCells(tool: string, start: Cell, end: Cell): Promise<void> {
    await this.clickTool(tool)
    await this.grid.drag(start, end)
  }

  async expectToolActive(name: string): Promise<void> {
    const btn = this.screen.getByRole('button', { name: name.charAt(0).toUpperCase() + name.slice(1) })
    await expect.element(btn).toHaveAttribute('aria-pressed', 'true')
  }
}
