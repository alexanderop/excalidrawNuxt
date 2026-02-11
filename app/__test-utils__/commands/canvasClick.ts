import type { BrowserCommand } from "vitest/node";

interface ModifierKeys {
  shiftKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
}

declare module "vitest/browser" {
  interface BrowserCommands {
    canvasClick: (selector: string, x: number, y: number, options?: ModifierKeys) => Promise<void>;
  }
}

/**
 * Perform a single pointer click on a canvas element by dispatching
 * PointerEvents directly within the iframe's document.
 *
 * Coordinates are relative to the element (not the viewport).
 * Dispatches pointerdown followed by pointerup.
 */
export const canvasClick: BrowserCommand<
  [selector: string, x: number, y: number, options?: ModifierKeys]
> = async (ctx, selector, x, y, options) => {
  // @ts-expect-error -- vitest browser command context exposes frame() at runtime
  const frame = await ctx.frame();

  await frame.evaluate(
    ({ sel, px, py, opts }: { sel: string; px: number; py: number; opts: ModifierKeys }) => {
      const el = document.querySelector(sel);
      if (!el) throw new Error(`Element "${sel}" not found`);
      const rect = el.getBoundingClientRect();

      function fire(type: string, buttons: number): void {
        const evt = new PointerEvent(type, {
          clientX: rect.left + px,
          clientY: rect.top + py,
          button: 0,
          buttons,
          bubbles: true,
          cancelable: true,
          pointerId: 1,
          pointerType: "mouse",
          isPrimary: true,
          shiftKey: opts.shiftKey ?? false,
          metaKey: opts.metaKey ?? false,
          altKey: opts.altKey ?? false,
        });
        // Synthetic events may not compute offsetX/offsetY from clientX/clientY.
        // Override them so handlers using e.offsetX/e.offsetY get correct values.
        Object.defineProperty(evt, "offsetX", { value: px });
        Object.defineProperty(evt, "offsetY", { value: py });
        el!.dispatchEvent(evt);
      }

      fire("pointerdown", 1);
      fire("pointerup", 0);
    },
    { sel: selector, px: x, py: y, opts: options ?? {} },
  );
};
