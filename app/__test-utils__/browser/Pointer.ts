import { commands } from 'vitest/browser'

const CANVAS_SELECTOR = '[data-testid="interactive-canvas"]'

export class Pointer {
  private x = 0
  private y = 0

  async clickAt(x: number, y: number, options?: { shiftKey?: boolean; metaKey?: boolean }): Promise<void> {
    this.x = x
    this.y = y
    await commands.canvasClick(CANVAS_SELECTOR, x, y, options)
  }

  async drag(startX: number, startY: number, endX: number, endY: number, options?: { steps?: number }): Promise<void> {
    this.x = endX
    this.y = endY
    await commands.canvasDrag(CANVAS_SELECTOR, startX, startY, endX, endY, options)
  }

  async dragBy(dx: number, dy: number, options?: { steps?: number }): Promise<void> {
    const startX = this.x
    const startY = this.y
    await this.drag(startX, startY, startX + dx, startY + dy, options)
  }

  get position(): { x: number; y: number } {
    return { x: this.x, y: this.y }
  }
}
