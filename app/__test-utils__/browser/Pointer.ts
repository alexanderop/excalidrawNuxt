import { commands } from 'vitest/browser'
import type { ExcalidrawElement } from '~/features/elements/types'

const CANVAS_SELECTOR = '[data-testid="interactive-canvas"]'

export interface ModifierKeys {
  shiftKey?: boolean
  metaKey?: boolean
  altKey?: boolean
  ctrlKey?: boolean
}

export class Pointer {
  private x = 0
  private y = 0
  private modifiers: ModifierKeys = {}

  /** Scoped modifier context (Excalidraw pattern). */
  async withModifiers(mods: ModifierKeys, fn: () => Promise<void>): Promise<void> {
    const prev = { ...this.modifiers }
    this.modifiers = { ...this.modifiers, ...mods }
    await fn()
    this.modifiers = prev
  }

  async clickAt(x: number, y: number, opts?: ModifierKeys): Promise<void> {
    this.x = x
    this.y = y
    await commands.canvasClick(CANVAS_SELECTOR, x, y, { ...this.modifiers, ...opts })
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

  /** Click on an element's center (Excalidraw pattern). */
  async clickOn(element: ExcalidrawElement, opts?: ModifierKeys): Promise<void> {
    const cx = element.x + element.width / 2
    const cy = element.y + element.height / 2
    await this.clickAt(cx, cy, opts)
  }

  /** Shift-click multiple elements to select them (Excalidraw pattern). */
  async select(elements: ExcalidrawElement | ExcalidrawElement[]): Promise<void> {
    const els = Array.isArray(elements) ? elements : [elements]
    if (els.length === 0) return
    // Click first element without shift
    await this.clickOn(els[0]!)
    // Shift-click the rest
    for (const el of els.slice(1)) {
      await this.clickOn(el, { shiftKey: true })
    }
  }

  get position(): { x: number; y: number } {
    return { x: this.x, y: this.y }
  }
}
