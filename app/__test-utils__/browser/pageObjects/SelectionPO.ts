import type { ExcalidrawElement } from "@drawvue/core";
import type { Cell } from "../CanvasGrid";
import { API } from "../api";
import { assertSelectedElements } from "../../matchers/assertSelectedElements";
import type { CanvasPO } from "./CanvasPO";

export class SelectionPO {
  constructor(private canvas: CanvasPO) {}

  async clickElement(el: ExcalidrawElement): Promise<void> {
    await this.canvas.pointer.clickOn(el);
  }

  async shiftClickElement(el: ExcalidrawElement): Promise<void> {
    await this.canvas.pointer.clickOn(el, { shiftKey: true });
  }

  async boxSelect(start: Cell, end: Cell): Promise<void> {
    await this.canvas.grid.drag(start, end);
  }

  async selectElements(...els: ExcalidrawElement[]): Promise<void> {
    await this.canvas.pointer.select(els);
  }

  /** Programmatically set selected elements (no pointer interaction). */
  setSelected(...els: ExcalidrawElement[]): void {
    API.setSelectedElements(els);
  }

  clear(): void {
    API.clearSelection();
  }

  expectSelected(...ids: string[]): void {
    assertSelectedElements(...ids);
  }

  expectNoneSelected(): void {
    assertSelectedElements();
  }
}
