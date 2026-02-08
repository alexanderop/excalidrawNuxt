import type { BrowserCommand } from 'vitest/node'

declare module 'vitest/browser' {
  interface BrowserCommands {
    showGridOverlay: (
      selector: string,
      cols: number,
      rows: number,
      duration?: number,
    ) => Promise<void>
  }
}

/**
 * Inject a visual SVG grid overlay into the iframe for debugging.
 *
 * Draws semi-transparent red grid lines and cell labels ("0,0", "1,2", …)
 * over the canvas element. The overlay is pointer-events: none so it doesn't
 * interfere with interactions. Auto-removes after `duration` ms (default 5000).
 */
export const showGridOverlay: BrowserCommand<[
  selector: string,
  cols: number,
  rows: number,
  duration?: number,
]> = async (ctx, selector, cols, rows, duration) => {
  // @ts-expect-error -- vitest browser command context exposes frame() at runtime
  const frame = await ctx.frame()

  await frame.evaluate(
    ({ sel, c, r, dur }: { sel: string; c: number; r: number; dur: number }) => {
      const el = document.querySelector(sel)
      if (!el) throw new Error(`Element "${sel}" not found`)

      const rect = el.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      const cellW = w / c
      const cellH = h / r

      const ns = 'http://www.w3.org/2000/svg'
      const svg = document.createElementNS(ns, 'svg')
      svg.setAttribute('width', String(w))
      svg.setAttribute('height', String(h))
      svg.style.position = 'absolute'
      svg.style.left = `${rect.left}px`
      svg.style.top = `${rect.top}px`
      svg.style.pointerEvents = 'none'
      svg.style.zIndex = '9999'
      svg.id = 'canvas-grid-overlay'

      // Remove any existing overlay
      document.querySelector('#canvas-grid-overlay')?.remove()

      // Draw vertical lines
      for (let col = 0; col <= c; col++) {
        const line = document.createElementNS(ns, 'line')
        const x = col * cellW
        line.setAttribute('x1', String(x))
        line.setAttribute('y1', '0')
        line.setAttribute('x2', String(x))
        line.setAttribute('y2', String(h))
        line.setAttribute('stroke', 'rgba(255, 0, 0, 0.3)')
        line.setAttribute('stroke-width', '1')
        svg.append(line)
      }

      // Draw horizontal lines
      for (let row = 0; row <= r; row++) {
        const line = document.createElementNS(ns, 'line')
        const y = row * cellH
        line.setAttribute('x1', '0')
        line.setAttribute('y1', String(y))
        line.setAttribute('x2', String(w))
        line.setAttribute('y2', String(y))
        line.setAttribute('stroke', 'rgba(255, 0, 0, 0.3)')
        line.setAttribute('stroke-width', '1')
        svg.append(line)
      }

      // Draw cell labels
      for (let col = 0; col < c; col++) {
        for (let row = 0; row < r; row++) {
          const text = document.createElementNS(ns, 'text')
          text.setAttribute('x', String((col + 0.5) * cellW))
          text.setAttribute('y', String((row + 0.5) * cellH))
          text.setAttribute('text-anchor', 'middle')
          text.setAttribute('dominant-baseline', 'central')
          text.setAttribute('fill', 'rgba(255, 0, 0, 0.4)')
          text.setAttribute('font-size', '10')
          text.setAttribute('font-family', 'monospace')
          text.textContent = `${col},${row}`
          svg.append(text)
        }
      }

      document.body.append(svg)

      setTimeout(() => {
        svg.remove()
      }, dur)
    },
    { sel: selector, c: cols, r: rows, dur: duration ?? 5000 },
  )
}
