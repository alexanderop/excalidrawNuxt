import type { ExcalidrawElement, ExcalidrawRectangleElement, ToolType } from "@drawvue/core";
import { render } from "vitest-browser-vue";
import { onTestFinished } from "vitest";
import { reseed, restoreSeed } from "@drawvue/core/test-utils";
import DrawVueTestHarness from "./DrawVueTestHarness.vue";
import { waitForCanvasReady, waitForPaint } from "./waiters";
import { API } from "./api";
import { Pointer } from "./Pointer";
import type { ModifierKeys } from "./Pointer";
import { Keyboard } from "./Keyboard";
import { CanvasGrid } from "./CanvasGrid";
import type { Cell } from "./CanvasGrid";
import { assertSelectedElements } from "../matchers/assertSelectedElements";
import { checkpoint as checkpointFn } from "./checkpoint";

export interface LiveElement {
  id: string;
  get: () => ExcalidrawElement;
}

/**
 * Unified test helper for browser tests — inspired by tldraw's TestEditor.
 *
 * Consolidates CanvasPage, page objects, API, Pointer, Keyboard, and CanvasGrid
 * into a single flat API. Existing helpers remain as implementation details.
 */
export class TestDrawVue {
  readonly pointer: Pointer;
  readonly keyboard: Keyboard;
  readonly grid: CanvasGrid;
  readonly screen: ReturnType<typeof render>;

  private constructor(screen: ReturnType<typeof render>) {
    this.screen = screen;
    this.pointer = new Pointer();
    this.keyboard = new Keyboard();
    this.grid = new CanvasGrid();
  }

  static async create(): Promise<TestDrawVue> {
    reseed();
    onTestFinished(() => restoreSeed());

    if (globalThis.__h) {
      API.setElements([]);
      API.clearSelection();
      API.setTool("selection");
    }

    const screen = render(DrawVueTestHarness);
    await waitForCanvasReady();

    return new TestDrawVue(screen);
  }

  // ── Elements: create & query ─────────────────────────────────

  /** Add element programmatically (no pointer interaction). */
  addElement(overrides?: Partial<ExcalidrawRectangleElement>): ExcalidrawElement {
    return API.addElement(overrides);
  }

  /** Add multiple elements programmatically. */
  addElements(...overrides: Array<Partial<ExcalidrawRectangleElement>>): ExcalidrawElement[] {
    return overrides.map((o) => API.addElement(o));
  }

  /** Select a tool, drag from start to end, and return a live accessor. */
  async createElement(tool: string, start: Cell, end: Cell): Promise<LiveElement> {
    const beforeCount = API.elements.length;
    await this.selectTool(tool);
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

  /** Select a tool and draw from start to end (no accessor returned). */
  async createElementAtCells(tool: string, start: Cell, end: Cell): Promise<void> {
    await this.selectTool(tool);
    await this.grid.drag(start, end);
  }

  /** All elements on canvas. */
  get elements(): readonly ExcalidrawElement[] {
    return API.elements;
  }

  /** Element count. */
  get elementCount(): number {
    return API.elements.length;
  }

  /** Find element by ID (throws if missing). */
  getElement(id: string): ExcalidrawElement {
    const el = API.getElementByID(id);
    if (!el) throw new Error(`Element "${id}" not found`);
    return el;
  }

  /** Last element in the scene. */
  getLastElement<T extends ExcalidrawElement = ExcalidrawElement>(): T {
    const el = API.elements.at(-1);
    if (!el) throw new Error("No elements on canvas");
    return el as T;
  }

  // ── Selection ────────────────────────────────────────────────

  /** Click on an element's center to select it. */
  async clickElement(el: ExcalidrawElement): Promise<void> {
    await this.pointer.clickOn(el);
  }

  /** Shift-click an element to add it to the selection. */
  async shiftClickElement(el: ExcalidrawElement): Promise<void> {
    await this.pointer.clickOn(el, { shiftKey: true });
  }

  /** Drag a selection box between two grid cells. */
  async boxSelect(start: Cell, end: Cell): Promise<void> {
    await this.grid.drag(start, end);
  }

  /** Click-select one element, then shift-click the rest. */
  async selectElements(...els: ExcalidrawElement[]): Promise<void> {
    await this.pointer.select(els);
  }

  /** Programmatically set selection (no pointer interaction). */
  select(...els: ExcalidrawElement[]): void {
    API.setSelectedElements(els);
  }

  /** Clear selection programmatically. */
  clearSelection(): void {
    API.clearSelection();
  }

  /** Currently selected elements. */
  get selectedElements(): ExcalidrawElement[] {
    return API.getSelectedElements();
  }

  /** IDs of currently selected elements. */
  get selectedIds(): string[] {
    return API.getSelectedElements().map((e) => e.id);
  }

  // ── Tools ────────────────────────────────────────────────────

  private static readonly TOOL_SHORTCUTS: Record<string, string> = {
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

  /** Active tool. */
  get activeTool(): ToolType {
    return API.activeTool;
  }

  /** Set tool programmatically (no keyboard). */
  setTool(tool: ToolType): void {
    API.setTool(tool);
  }

  /** Select a tool via keyboard shortcut. */
  async selectTool(name: string): Promise<void> {
    const shortcut = TestDrawVue.TOOL_SHORTCUTS[name];
    if (!shortcut) throw new Error(`Unknown tool: ${name}`);
    await this.keyboard.press(shortcut);
  }

  // ── Viewport ─────────────────────────────────────────────────

  get scrollX(): number {
    return API.scrollX;
  }
  get scrollY(): number {
    return API.scrollY;
  }
  get zoom(): number {
    return API.zoom;
  }

  panBy(dx: number, dy: number): void {
    API.h.panBy(dx, dy);
  }

  zoomBy(delta: number, center?: { x: number; y: number }): void {
    API.h.zoomBy(delta, center);
  }

  // ── Interactions ─────────────────────────────────────────────

  /** Click at a grid cell. */
  async click(cell: Cell, opts?: ModifierKeys): Promise<void> {
    await this.grid.click(cell, opts);
  }

  /** Click at the center of a bounding box defined by two cells. */
  async clickCenter(start: Cell, end: Cell, opts?: ModifierKeys): Promise<void> {
    await this.grid.clickCenter(start, end, opts);
  }

  /** Double-click at a grid cell. */
  async dblClick(cell: Cell, opts?: ModifierKeys): Promise<void> {
    await this.grid.dblClick(cell, opts);
  }

  /** Drag between two grid cells. */
  async drag(start: Cell, end: Cell, opts?: { steps?: number }): Promise<void> {
    await this.grid.drag(start, end, opts);
  }

  /** Right-click at a grid cell. */
  async rightClick(cell: Cell): Promise<void> {
    await this.grid.rightClick(cell);
  }

  /** Dispatch a wheel event at a grid cell. */
  async wheel(
    cell: Cell,
    options?: {
      deltaX?: number;
      deltaY?: number;
      ctrlKey?: boolean;
      shiftKey?: boolean;
      metaKey?: boolean;
    },
  ): Promise<void> {
    await this.grid.wheel(cell, options);
  }

  /** Middle-click drag between two grid cells (for panning). */
  async middleClickDrag(start: Cell, end: Cell): Promise<void> {
    await this.grid.middleClickDrag(start, end);
  }

  /** Press a key. */
  async keyPress(key: string): Promise<void> {
    await this.keyboard.press(key);
  }

  async undo(): Promise<void> {
    await this.keyboard.undo();
  }

  async redo(): Promise<void> {
    await this.keyboard.redo();
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

  /** Run a function with modifier keys held. */
  async withModifiers(mods: ModifierKeys, fn: () => Promise<void>): Promise<void> {
    await this.keyboard.withModifierKeys(mods, fn);
  }

  // ── Rendering ────────────────────────────────────────────────

  /** Mark static layer dirty + wait one animation frame. */
  async flush(): Promise<void> {
    API.h.markStaticDirty();
    await waitForPaint();
  }

  // ── Assertions ───────────────────────────────────────────────

  /** Assert active tool. */
  expectToolToBe(tool: ToolType): void {
    expect(API.activeTool).toBe(tool);
  }

  /** Assert element count. */
  expectElementCount(n: number): void {
    expect(API.elements).toHaveLength(n);
  }

  /** Assert element type at index. */
  expectElementType(index: number, type: string): void {
    expect(API.elements[index]!.type).toBe(type);
  }

  /** Assert exact selected IDs (order-agnostic). */
  expectSelected(...ids: string[]): void {
    assertSelectedElements(...ids);
  }

  /** Assert nothing selected. */
  expectNoneSelected(): void {
    assertSelectedElements();
  }

  /** Snapshot checkpoint for regression testing. */
  checkpoint(name: string): void {
    checkpointFn(name);
  }

  /** Assert toolbar button shows as active (via aria-pressed). */
  async expectToolActive(name: string): Promise<void> {
    const TOOL_LABELS: Record<string, string> = { freedraw: "Pencil" };
    const label = TOOL_LABELS[name] ?? name.charAt(0).toUpperCase() + name.slice(1);
    const btn = this.screen.getByRole("button", { name: label });
    await expect.element(btn).toHaveAttribute("aria-pressed", "true");
  }
}
