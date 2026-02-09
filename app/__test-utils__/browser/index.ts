export { Pointer } from './Pointer'
export { Keyboard } from './Keyboard'
export { UI } from './UI'
export { CanvasGrid } from './CanvasGrid'
export type { Cell } from './CanvasGrid'

const CANVAS_SELECTOR = '[data-testid="interactive-canvas"]'

/**
 * Wait until the canvas renderer has bootstrapped (set `canvas.style.width`).
 *
 * The default HTML `<canvas>` has `width=300` / `height=150`, so polling
 * `canvas.width > 0` passes immediately before `useRenderer.bootstrapCanvas`
 * runs.  Checking `style.width` is reliable because only `bootstrapCanvas`
 * sets it.
 */
export async function waitForCanvasReady(): Promise<void> {
  await expect.poll(() => {
     
    const canvas = document.querySelector<HTMLCanvasElement>(CANVAS_SELECTOR)
    return canvas?.style.width ?? ''
  }, { timeout: 5000 }).not.toBe('')
  // Extra frame to ensure all dirty layers have painted
  await new Promise<void>(r => requestAnimationFrame(() => r()))
}

/** Wait a single animation frame for paint to complete. */
export async function waitForPaint(): Promise<void> {
  await new Promise<void>(r => requestAnimationFrame(() => r()))
}
