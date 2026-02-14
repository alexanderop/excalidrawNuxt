import { createApp, effectScope } from "vue";
import { createDrawVue, DRAWVUE_KEY, type DrawVueContext } from "../context";

/**
 * Test helper that creates a fresh DrawVue context and runs a composable
 * within it. Each call gets isolated state — no `beforeEach` resets needed.
 *
 * Uses `app.provide()` so that `inject()` inside composables can find the
 * context via `currentApp._context.provides` (Vue's `provide()` from the
 * composition API requires a component instance which doesn't exist here).
 *
 * Usage:
 *   using ctx = withDrawVue(() => useFoo());
 *   // ctx has all properties from useFoo() plus ctx.drawVue for the context
 */
export function withDrawVue<T extends object>(
  composable: (ctx: DrawVueContext) => T,
): T & { drawVue: DrawVueContext } & Disposable {
  const scope = effectScope();
  let result!: T;

  const app = createApp({ setup: () => () => null });
  const drawVueCtx = createDrawVue();
  app.provide(DRAWVUE_KEY, drawVueCtx);

  app.runWithContext(() => {
    scope.run(() => {
      result = composable(drawVueCtx);
    });
  });

  return Object.assign({}, result, {
    drawVue: drawVueCtx,
    [Symbol.dispose]() {
      scope.stop();
      app.unmount();
    },
  });
}
