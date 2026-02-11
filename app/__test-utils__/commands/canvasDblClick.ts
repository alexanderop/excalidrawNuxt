import type { BrowserCommand } from "vitest/node";

interface ModifierKeys {
  shiftKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
}

declare module "vitest/browser" {
  interface BrowserCommands {
    canvasDblClick: (
      selector: string,
      x: number,
      y: number,
      options?: ModifierKeys,
    ) => Promise<void>;
  }
}

/**
 * Perform a double-click on a canvas element by dispatching
 * PointerEvents + a MouseEvent('dblclick') directly within the iframe's document.
 *
 * Coordinates are relative to the element (not the viewport).
 * Dispatches: pointerdown → pointerup → pointerdown → pointerup → dblclick
 */
export const canvasDblClick: BrowserCommand<
  [selector: string, x: number, y: number, options?: ModifierKeys]
> = async (ctx, selector, x, y, options) => {
  // @ts-expect-error -- vitest browser command context exposes frame() at runtime
  const frame = await ctx.frame();

  await frame.evaluate(
    ({ sel, px, py, opts }: { sel: string; px: number; py: number; opts: ModifierKeys }) => {
      const el = document.querySelector(sel);
      if (!el) throw new Error(`Element "${sel}" not found`);
      const rect = el.getBoundingClientRect();

      const shared = {
        clientX: rect.left + px,
        clientY: rect.top + py,
        button: 0,
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        pointerType: "mouse" as const,
        isPrimary: true,
        shiftKey: opts.shiftKey ?? false,
        metaKey: opts.metaKey ?? false,
        altKey: opts.altKey ?? false,
      };

      // First click
      el.dispatchEvent(new PointerEvent("pointerdown", { ...shared, buttons: 1 }));
      el.dispatchEvent(new PointerEvent("pointerup", { ...shared, buttons: 0 }));
      // Second click
      el.dispatchEvent(new PointerEvent("pointerdown", { ...shared, buttons: 1 }));
      el.dispatchEvent(new PointerEvent("pointerup", { ...shared, buttons: 0 }));
      // dblclick event (MouseEvent, not PointerEvent)
      el.dispatchEvent(
        new MouseEvent("dblclick", {
          clientX: shared.clientX,
          clientY: shared.clientY,
          button: 0,
          bubbles: true,
          cancelable: true,
          shiftKey: shared.shiftKey,
          metaKey: shared.metaKey,
          altKey: shared.altKey,
        }),
      );
    },
    { sel: selector, px: x, py: y, opts: options ?? {} },
  );
};
