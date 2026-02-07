import type { BrowserCommand } from 'vitest/node'

declare module '@vitest/browser/context' {
  interface BrowserCommands {
    canvasDrag: (
      selector: string,
      startX: number,
      startY: number,
      endX: number,
      endY: number,
      options?: { steps?: number },
    ) => Promise<void>
  }
}

/**
 * Perform a pointer drag on a canvas element by dispatching PointerEvents
 * directly within the iframe's document.
 *
 * Coordinates are relative to the element (not the viewport).
 * Dispatches the full pointerdown → pointermove (N steps) → pointerup sequence.
 *
 * Uses frame.evaluate to dispatch events inside the iframe, avoiding
 * page↔iframe coordinate translation issues that break page.mouse approaches.
 */
export const canvasDrag: BrowserCommand<[
  selector: string,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  options?: { steps?: number },
]> = async (ctx, selector, startX, startY, endX, endY, options) => {
  // @ts-expect-error -- vitest browser command context exposes frame() at runtime
  const frame = await ctx.frame()
  const steps = options?.steps ?? 5

  await frame.evaluate(
    ({ sel, sx, sy, ex, ey, s }: { sel: string; sx: number; sy: number; ex: number; ey: number; s: number }) => {
      const el = document.querySelector(sel)
      if (!el) throw new Error(`Element "${sel}" not found`)

      const rect = el.getBoundingClientRect()

      function fire(type: string, x: number, y: number): void {
        el!.dispatchEvent(new PointerEvent(type, {
          clientX: rect.left + x,
          clientY: rect.top + y,
          button: 0,
          buttons: type === 'pointerup' ? 0 : 1,
          bubbles: true,
          cancelable: true,
          pointerId: 1,
          pointerType: 'mouse',
          isPrimary: true,
        }))
      }

      fire('pointerdown', sx, sy)

      for (let i = 1; i <= s; i++) {
        const t = i / s
        fire('pointermove', sx + (ex - sx) * t, sy + (ey - sy) * t)
      }

      fire('pointerup', ex, ey)
    },
    { sel: selector, sx: startX, sy: startY, ex: endX, ey: endY, s: steps },
  )
}
