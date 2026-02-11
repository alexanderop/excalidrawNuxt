import type { ExcalidrawElement } from "~/features/elements/types";
import { CanvasGrid } from "../CanvasGrid";
import type { Cell } from "../CanvasGrid";
import { Pointer } from "../Pointer";
import { API } from "../api";
import { waitForPaint } from "../waiters";
import type { ToolbarPO } from "./ToolbarPO";

export interface LiveElement {
  id: string;
  get: () => ExcalidrawElement;
}

export class CanvasPO {
  readonly grid = new CanvasGrid();
  readonly pointer = new Pointer();

  constructor(private toolbar: ToolbarPO) {}

  async draw(start: Cell, end: Cell): Promise<void> {
    await this.grid.drag(start, end);
  }

  async click(
    cell: Cell,
    opts?: { shiftKey?: boolean; metaKey?: boolean; altKey?: boolean },
  ): Promise<void> {
    await this.grid.click(cell, opts);
  }

  async clickCenter(
    start: Cell,
    end: Cell,
    opts?: { shiftKey?: boolean; metaKey?: boolean; altKey?: boolean },
  ): Promise<void> {
    await this.grid.clickCenter(start, end, opts);
  }

  async dblClick(
    cell: Cell,
    opts?: { shiftKey?: boolean; metaKey?: boolean; altKey?: boolean },
  ): Promise<void> {
    await this.grid.dblClick(cell, opts);
  }

  /** Select a tool, draw from start to end, and return a live accessor to the created element. */
  async createElement(tool: string, start: Cell, end: Cell): Promise<LiveElement> {
    const beforeCount = API.elements.length;
    await this.toolbar.select(tool);
    await this.grid.drag(start, end);
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

  /** Select a tool and draw from start to end (no element accessor returned). */
  async createElementAtCells(tool: string, start: Cell, end: Cell): Promise<void> {
    await this.toolbar.select(tool);
    await this.grid.drag(start, end);
  }
}
