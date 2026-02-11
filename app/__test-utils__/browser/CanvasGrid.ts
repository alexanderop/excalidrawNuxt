import { commands } from "vitest/browser";

const CANVAS_SELECTOR = '[data-testid="interactive-canvas"]';

export type Cell = [col: number, row: number];

interface GridConfig {
  cols: number;
  rows: number;
  canvasWidth: number;
  canvasHeight: number;
  cellWidth: number;
  cellHeight: number;
}

interface CanvasGridOptions {
  cols?: number;
  rows?: number;
  canvasWidth?: number;
  canvasHeight?: number;
}

/**
 * Maps a logical grid (cols × rows) onto the actual canvas CSS dimensions.
 *
 * By default, canvas dimensions are **auto-detected** from the DOM the first
 * time a coordinate method is called. Pass explicit `canvasWidth`/`canvasHeight`
 * to override.  Call coordinate methods only *after* `waitForCanvasReady()`.
 */
export class CanvasGrid {
  private readonly cols: number;
  private readonly rows: number;
  private _canvasWidth: number;
  private _canvasHeight: number;
  private _resolved: boolean;

  constructor(options?: CanvasGridOptions) {
    this.cols = options?.cols ?? 16;
    this.rows = options?.rows ?? 9;
    this._canvasWidth = options?.canvasWidth ?? 0;
    this._canvasHeight = options?.canvasHeight ?? 0;
    this._resolved = this._canvasWidth > 0 && this._canvasHeight > 0;
  }

  /** Lazily read actual canvas CSS dimensions from the DOM. */
  private resolve(): void {
    if (this._resolved) return;

    const canvas = document.querySelector<HTMLCanvasElement>(CANVAS_SELECTOR);
    if (!canvas)
      throw new Error(`Canvas "${CANVAS_SELECTOR}" not found — call waitForCanvasReady() first`);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) {
      throw new Error(
        `Canvas has zero CSS dimensions (${w}×${h}). Ensure the container is properly sized.`,
      );
    }
    this._canvasWidth = w;
    this._canvasHeight = h;
    this._resolved = true;
  }

  private get cellWidth(): number {
    return this._canvasWidth / this.cols;
  }
  private get cellHeight(): number {
    return this._canvasHeight / this.rows;
  }

  toPixels(cell: Cell): { x: number; y: number } {
    this.resolve();
    const [col, row] = cell;
    return {
      x: (col + 0.5) * this.cellWidth,
      y: (row + 0.5) * this.cellHeight,
    };
  }

  centerOf(start: Cell, end: Cell): Cell {
    return [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
  }

  async click(
    cell: Cell,
    options?: { shiftKey?: boolean; metaKey?: boolean; altKey?: boolean },
  ): Promise<void> {
    const { x, y } = this.toPixels(cell);
    await commands.canvasClick(CANVAS_SELECTOR, x, y, options);
  }

  async clickCenter(
    start: Cell,
    end: Cell,
    options?: { shiftKey?: boolean; metaKey?: boolean; altKey?: boolean },
  ): Promise<void> {
    const center = this.centerOf(start, end);
    await this.click(center, options);
  }

  async dblClick(
    cell: Cell,
    options?: { shiftKey?: boolean; metaKey?: boolean; altKey?: boolean },
  ): Promise<void> {
    const { x, y } = this.toPixels(cell);
    await commands.canvasDblClick(CANVAS_SELECTOR, x, y, options);
  }

  async dblClickCenter(
    start: Cell,
    end: Cell,
    options?: { shiftKey?: boolean; metaKey?: boolean; altKey?: boolean },
  ): Promise<void> {
    const center = this.centerOf(start, end);
    await this.dblClick(center, options);
  }

  async drag(start: Cell, end: Cell, options?: { steps?: number }): Promise<void> {
    const startPx = this.toPixels(start);
    const endPx = this.toPixels(end);
    await commands.canvasDrag(CANVAS_SELECTOR, startPx.x, startPx.y, endPx.x, endPx.y, options);
  }

  async showOverlay(duration?: number): Promise<void> {
    await commands.showGridOverlay(CANVAS_SELECTOR, this.cols, this.rows, duration);
  }

  getConfig(): GridConfig {
    this.resolve();
    return {
      cols: this.cols,
      rows: this.rows,
      canvasWidth: this._canvasWidth,
      canvasHeight: this._canvasHeight,
      cellWidth: this.cellWidth,
      cellHeight: this.cellHeight,
    };
  }
}
