import type { BrowserCommand } from "vitest/node";

interface WheelOptions {
  deltaX?: number;
  deltaY?: number;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
}

declare module "vitest/browser" {
  interface BrowserCommands {
    canvasWheel: (selector: string, x: number, y: number, options?: WheelOptions) => Promise<void>;
  }
}

/**
 * Dispatch a WheelEvent on a canvas element directly within the iframe's document.
 *
 * Coordinates are relative to the element (not the viewport).
 * Cancelable so that usePanning's e.preventDefault() works.
 */
export const canvasWheel: BrowserCommand<
  [selector: string, x: number, y: number, options?: WheelOptions]
> = async (ctx, selector, x, y, options) => {
  // @ts-expect-error -- vitest browser command context exposes frame() at runtime
  const frame = await ctx.frame();

  await frame.evaluate(
    ({ sel, px, py, opts }: { sel: string; px: number; py: number; opts: WheelOptions }) => {
      const el = document.querySelector(sel);
      if (!el) throw new Error(`Element "${sel}" not found`);
      const rect = el.getBoundingClientRect();

      const evt = new WheelEvent("wheel", {
        clientX: rect.left + px,
        clientY: rect.top + py,
        deltaX: opts.deltaX ?? 0,
        deltaY: opts.deltaY ?? 0,
        deltaMode: 0, // DOM_DELTA_PIXEL
        ctrlKey: opts.ctrlKey ?? false,
        shiftKey: opts.shiftKey ?? false,
        metaKey: opts.metaKey ?? false,
        bubbles: true,
        cancelable: true,
      });

      Object.defineProperty(evt, "offsetX", { value: px });
      Object.defineProperty(evt, "offsetY", { value: py });

      el.dispatchEvent(evt);
    },
    { sel: selector, px: x, py: y, opts: options ?? {} },
  );
};
