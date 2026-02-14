import { render } from "vitest-browser-vue";
import DrawVueTestHarness from "./DrawVueTestHarness.vue";
import { UI } from "./UI";
import { CanvasGrid } from "./CanvasGrid";

describe("CanvasGrid browser integration", () => {
  // eslint-disable-next-line vitest/expect-expect -- assertion delegated to ui.expectToolActive
  it("draws a rectangle with grid coords and auto-resets tool", async () => {
    const screen = render(DrawVueTestHarness);
    const ui = new UI(screen);

    await ui.createElementAtCells("rectangle", [2, 2], [5, 5]);

    await ui.expectToolActive("selection");
  });

  // eslint-disable-next-line vitest/expect-expect -- assertion delegated to ui.expectToolActive
  it("clicks center of drawn rectangle to select it", async () => {
    const screen = render(DrawVueTestHarness);
    const ui = new UI(screen);

    await ui.createElementAtCells("rectangle", [2, 2], [6, 5]);

    const center = ui.grid.centerOf([2, 2], [6, 5]);
    await ui.grid.click(center);

    await ui.expectToolActive("selection");
  });

  // eslint-disable-next-line vitest/expect-expect -- assertion delegated to ui.expectToolActive
  it("drags with grid coords same as pixel-based drag", async () => {
    const screen = render(DrawVueTestHarness);
    const ui = new UI(screen);

    // Draw arrow with grid API
    await ui.clickTool("arrow");
    await ui.grid.drag([1, 1], [4, 4]);

    // Tool should auto-reset to selection
    await ui.expectToolActive("selection");
  });
});

describe("showGridOverlay", () => {
  it("injects an SVG overlay into the DOM", async () => {
    render(DrawVueTestHarness);
    const grid = new CanvasGrid();

    await grid.showOverlay(30_000);

    // eslint-disable-next-line no-restricted-syntax -- SVG overlay DOM query not expressible via page locators
    const svg = document.querySelector("#canvas-grid-overlay");
    expect(svg).not.toBeNull();
    expect(svg?.tagName.toLowerCase()).toBe("svg");
  });

  it("renders the correct number of grid lines", async () => {
    render(DrawVueTestHarness);
    const grid = new CanvasGrid();

    await grid.showOverlay(30_000);

    // eslint-disable-next-line no-restricted-syntax -- SVG overlay DOM query not expressible via page locators
    const svg = document.querySelector("#canvas-grid-overlay")!;
    // eslint-disable-next-line no-restricted-syntax -- querying SVG child elements
    const lines = svg.querySelectorAll("line");
    // 16 cols → 17 vertical lines, 9 rows → 10 horizontal lines = 27
    expect(lines).toHaveLength(27);
  });

  it("renders cell labels for every cell", async () => {
    render(DrawVueTestHarness);
    const grid = new CanvasGrid();

    await grid.showOverlay(30_000);

    // eslint-disable-next-line no-restricted-syntax -- SVG overlay DOM query not expressible via page locators
    const svg = document.querySelector("#canvas-grid-overlay")!;
    // eslint-disable-next-line no-restricted-syntax -- querying SVG child elements
    const labels = svg.querySelectorAll("text");
    // 16 cols × 9 rows = 144 labels
    expect(labels).toHaveLength(144);
    // Check corner labels exist
    expect(labels[0]?.textContent).toBe("0,0");
    expect([...labels].at(-1)?.textContent).toBe("15,8");
  });

  it("sets pointer-events to none so it does not block interactions", async () => {
    render(DrawVueTestHarness);
    const grid = new CanvasGrid();

    await grid.showOverlay(30_000);

    // eslint-disable-next-line no-restricted-syntax -- SVG overlay DOM query not expressible via page locators
    const svg = document.querySelector<SVGElement>("#canvas-grid-overlay")!;
    expect(svg.style.pointerEvents).toBe("none");
  });

  it("auto-removes after the specified duration", async () => {
    render(DrawVueTestHarness);
    const grid = new CanvasGrid();

    await grid.showOverlay(100);

    // eslint-disable-next-line no-restricted-syntax -- SVG overlay DOM query not expressible via page locators
    expect(document.querySelector("#canvas-grid-overlay")).not.toBeNull();

    await new Promise((r) => setTimeout(r, 200));

    // eslint-disable-next-line no-restricted-syntax -- SVG overlay DOM query not expressible via page locators
    expect(document.querySelector("#canvas-grid-overlay")).toBeNull();
  });

  it("replaces a previous overlay when called again", async () => {
    render(DrawVueTestHarness);
    const grid = new CanvasGrid();

    await grid.showOverlay(30_000);
    await grid.showOverlay(30_000);

    // eslint-disable-next-line no-restricted-syntax -- SVG overlay DOM query not expressible via page locators
    const overlays = document.querySelectorAll("#canvas-grid-overlay");
    expect(overlays).toHaveLength(1);
  });
});
