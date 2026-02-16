import type { BrowserCommand } from "vitest/node";

declare module "vitest/browser" {
  interface BrowserCommands {
    canvasRightClick: (selector: string, x: number, y: number) => Promise<void>;
  }
}

/**
 * Perform a right-click on a canvas element by dispatching
 * PointerEvents + a MouseEvent('contextmenu') directly within the iframe's document.
 *
 * Coordinates are relative to the element (not the viewport).
 * Dispatches: pointerdown (button 2) → pointerup (button 2) → contextmenu
 */
export const canvasRightClick: BrowserCommand<[selector: string, x: number, y: number]> = async (
  ctx,
  selector,
  x,
  y,
) => {
  // @ts-expect-error -- vitest browser command context exposes frame() at runtime
  const frame = await ctx.frame();

  await frame.evaluate(
    ({ sel, px, py }: { sel: string; px: number; py: number }) => {
      const el = document.querySelector(sel);
      if (!el) throw new Error(`Element "${sel}" not found`);
      const rect = el.getBoundingClientRect();

      const clientX = rect.left + px;
      const clientY = rect.top + py;

      function withOffset<T extends PointerEvent | MouseEvent>(evt: T): T {
        Object.defineProperty(evt, "offsetX", { value: px });
        Object.defineProperty(evt, "offsetY", { value: py });
        return evt;
      }

      // pointerdown with button 2 (right)
      el.dispatchEvent(
        withOffset(
          new PointerEvent("pointerdown", {
            clientX,
            clientY,
            button: 2,
            buttons: 2,
            bubbles: true,
            cancelable: true,
            pointerId: 1,
            pointerType: "mouse",
            isPrimary: true,
          }),
        ),
      );

      // pointerup with button 2
      el.dispatchEvent(
        withOffset(
          new PointerEvent("pointerup", {
            clientX,
            clientY,
            button: 2,
            buttons: 0,
            bubbles: true,
            cancelable: true,
            pointerId: 1,
            pointerType: "mouse",
            isPrimary: true,
          }),
        ),
      );

      // contextmenu MouseEvent (what @contextmenu handler listens for)
      el.dispatchEvent(
        withOffset(
          new MouseEvent("contextmenu", {
            clientX,
            clientY,
            button: 2,
            bubbles: true,
            cancelable: true,
          }),
        ),
      );
    },
    { sel: selector, px: x, py: y },
  );
};
