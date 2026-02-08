import { commands } from 'vitest/browser'

const CANVAS_SELECTOR = '[data-testid="interactive-canvas"]'

export type Cell = [col: number, row: number]

interface GridConfig {
  cols: number
  rows: number
  canvasWidth: number
  canvasHeight: number
  cellWidth: number
  cellHeight: number
}

interface CanvasGridOptions {
  cols?: number
  rows?: number
  canvasWidth?: number
  canvasHeight?: number
}

export class CanvasGrid {
  private readonly cols: number
  private readonly rows: number
  private readonly canvasWidth: number
  private readonly canvasHeight: number
  private readonly cellWidth: number
  private readonly cellHeight: number

  constructor(options?: CanvasGridOptions) {
    this.cols = options?.cols ?? 16
    this.rows = options?.rows ?? 9
    this.canvasWidth = options?.canvasWidth ?? 1280
    this.canvasHeight = options?.canvasHeight ?? 720
    this.cellWidth = this.canvasWidth / this.cols
    this.cellHeight = this.canvasHeight / this.rows
  }

  toPixels(cell: Cell): { x: number; y: number } {
    const [col, row] = cell
    return {
      x: (col + 0.5) * this.cellWidth,
      y: (row + 0.5) * this.cellHeight,
    }
  }

  centerOf(start: Cell, end: Cell): Cell {
    return [
      (start[0] + end[0]) / 2,
      (start[1] + end[1]) / 2,
    ]
  }

  async click(cell: Cell, options?: { shiftKey?: boolean; metaKey?: boolean; altKey?: boolean }): Promise<void> {
    const { x, y } = this.toPixels(cell)
    await commands.canvasClick(CANVAS_SELECTOR, x, y, options)
  }

  async clickCenter(start: Cell, end: Cell, options?: { shiftKey?: boolean; metaKey?: boolean; altKey?: boolean }): Promise<void> {
    const center = this.centerOf(start, end)
    await this.click(center, options)
  }

  async drag(start: Cell, end: Cell, options?: { steps?: number }): Promise<void> {
    const startPx = this.toPixels(start)
    const endPx = this.toPixels(end)
    await commands.canvasDrag(CANVAS_SELECTOR, startPx.x, startPx.y, endPx.x, endPx.y, options)
  }

  async showOverlay(duration?: number): Promise<void> {
    await commands.showGridOverlay(
      CANVAS_SELECTOR,
      this.cols,
      this.rows,
      duration,
    )
  }

  getConfig(): GridConfig {
    return {
      cols: this.cols,
      rows: this.rows,
      canvasWidth: this.canvasWidth,
      canvasHeight: this.canvasHeight,
      cellWidth: this.cellWidth,
      cellHeight: this.cellHeight,
    }
  }
}
