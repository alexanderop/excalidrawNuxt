import { render } from 'vitest-browser-vue'
import { onTestFinished } from 'vitest'
import CanvasContainer from '~/features/canvas/components/CanvasContainer.vue'
import { reseed, restoreSeed } from '../../deterministicSeed'
import { waitForCanvasReady } from '../waiters'
import { Keyboard } from '../Keyboard'
import { ToolbarPO } from './ToolbarPO'
import { CanvasPO } from './CanvasPO'
import { SelectionPO } from './SelectionPO'
import { ScenePO } from './ScenePO'

export class CanvasPage {
  readonly toolbar: ToolbarPO
  readonly canvas: CanvasPO
  readonly selection: SelectionPO
  readonly scene: ScenePO
  readonly keyboard: Keyboard
  readonly screen: ReturnType<typeof render>

  private constructor(screen: ReturnType<typeof render>) {
    this.screen = screen
    this.toolbar = new ToolbarPO(screen)
    this.canvas = new CanvasPO(this.toolbar)
    this.selection = new SelectionPO(this.canvas)
    this.scene = new ScenePO()
    this.keyboard = new Keyboard()
  }

  static async create(): Promise<CanvasPage> {
    reseed()
    onTestFinished(() => restoreSeed())

    const screen = render(CanvasContainer)
    await waitForCanvasReady()

    return new CanvasPage(screen)
  }
}
