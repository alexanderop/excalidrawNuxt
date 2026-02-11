import { render } from "vitest-browser-vue";
import { onTestFinished } from "vitest";
import CanvasContainer from "~/features/canvas/components/CanvasContainer.vue";
import { reseed, restoreSeed } from "../../deterministicSeed";
import { waitForCanvasReady } from "../waiters";
import { API } from "../api";
import { Keyboard } from "../Keyboard";
import { ToolbarPO } from "./ToolbarPO";
import { CanvasPO } from "./CanvasPO";
import { SelectionPO } from "./SelectionPO";
import { ScenePO } from "./ScenePO";

export class CanvasPage {
  readonly toolbar: ToolbarPO;
  readonly canvas: CanvasPO;
  readonly selection: SelectionPO;
  readonly scene: ScenePO;
  readonly keyboard: Keyboard;
  readonly screen: ReturnType<typeof render>;

  private constructor(screen: ReturnType<typeof render>) {
    this.screen = screen;
    this.toolbar = new ToolbarPO(screen);
    this.canvas = new CanvasPO(this.toolbar);
    this.selection = new SelectionPO(this.canvas);
    this.scene = new ScenePO();
    this.keyboard = new Keyboard();
  }

  static async create(): Promise<CanvasPage> {
    reseed();
    onTestFinished(() => restoreSeed());

    // Reset global state so tests don't leak elements/selection across each other.
    // Guard: __h is only available after the first CanvasContainer mount.
    if (globalThis.__h) {
      API.setElements([]);
      API.clearSelection();
      API.setTool("selection");
    }

    const screen = render(CanvasContainer);
    await waitForCanvasReady();

    return new CanvasPage(screen);
  }
}
