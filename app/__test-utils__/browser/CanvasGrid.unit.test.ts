import { CanvasGrid } from "./CanvasGrid";

vi.mock("vitest/browser", () => ({
  commands: {},
}));

/** Explicit 1280×720 grid for unit tests (no DOM available to auto-detect). */
function createGrid(overrides?: ConstructorParameters<typeof CanvasGrid>[0]) {
  return new CanvasGrid({ canvasWidth: 1280, canvasHeight: 720, ...overrides });
}

describe("CanvasGrid", () => {
  describe("toPixels", () => {
    it("converts cell [0,0] to center of first cell", () => {
      const grid = createGrid();
      const px = grid.toPixels([0, 0]);
      expect(px).toEqual({ x: 40, y: 40 });
    });

    it("converts cell [15,8] to center of last cell", () => {
      const grid = createGrid();
      const px = grid.toPixels([15, 8]);
      expect(px).toEqual({ x: 1240, y: 680 });
    });

    it("handles fractional cells", () => {
      const grid = createGrid();
      const px = grid.toPixels([2.5, 3.5]);
      expect(px).toEqual({ x: 240, y: 320 });
    });

    it("works with custom grid dimensions", () => {
      const grid = createGrid({ cols: 10, rows: 10, canvasWidth: 1000, canvasHeight: 1000 });
      const px = grid.toPixels([0, 0]);
      expect(px).toEqual({ x: 50, y: 50 });
    });
  });

  describe("centerOf", () => {
    it("returns midpoint of a rectangular region", () => {
      const grid = createGrid();
      const center = grid.centerOf([1, 1], [3, 3]);
      expect(center).toEqual([2, 2]);
    });

    it("returns same cell for single-cell region", () => {
      const grid = createGrid();
      const center = grid.centerOf([5, 5], [5, 5]);
      expect(center).toEqual([5, 5]);
    });

    it("handles fractional inputs", () => {
      const grid = createGrid();
      const center = grid.centerOf([0, 0], [3, 5]);
      expect(center).toEqual([1.5, 2.5]);
    });
  });

  describe("getConfig", () => {
    it("returns explicit config", () => {
      const grid = createGrid();
      expect(grid.getConfig()).toEqual({
        cols: 16,
        rows: 9,
        canvasWidth: 1280,
        canvasHeight: 720,
        cellWidth: 80,
        cellHeight: 80,
      });
    });

    it("returns custom config", () => {
      const grid = createGrid({ cols: 10, rows: 10, canvasWidth: 1000, canvasHeight: 500 });
      expect(grid.getConfig()).toEqual({
        cols: 10,
        rows: 10,
        canvasWidth: 1000,
        canvasHeight: 500,
        cellWidth: 100,
        cellHeight: 50,
      });
    });
  });
});
