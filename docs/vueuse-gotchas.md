# VueUse Gotchas

> **This file is agent memory.** Update it when you discover VueUse pitfalls.

## useMagicKeys TypeScript Strictness

When destructuring from `useMagicKeys()`, TypeScript infers `ComputedRef<boolean> | undefined` because of the `Record<string, T>` index signature:

```ts
// ❌ TypeScript error: 'ComputedRef<boolean> | undefined' not assignable to watch source
const { r, o, d } = useMagicKeys()
watch(r, (pressed) => { ... })  // Error!
```

**Solution:** Use `useEventListener` with a key lookup map:

```ts
const KEY_TO_TOOL: Record<string, ToolType> = {
  r: 'rectangle',
  o: 'ellipse',
  d: 'diamond',
}

if (typeof document !== 'undefined') {
  useEventListener(document, 'keydown', (e: KeyboardEvent) => {
    const tool = KEY_TO_TOOL[e.key]
    if (tool) setTool(tool)
  })
}
```

## Document Access in Vitest Node Mode

Composables using `useEventListener(document, ...)` fail in Vitest unit tests (node mode) with "document is not defined".

**Solution:** Guard document access:

```ts
// ✅ Works in both browser and node-mode tests
if (typeof document !== 'undefined') {
  useEventListener(document, 'keydown', handler)
}
```

## Browser Vitest Config Requires Vue Plugin

When a Vue component imports other `.vue` files, the browser Vitest config needs `@vitejs/plugin-vue` explicitly:

```ts
// vitest.config.browser.ts
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue(), tailwindcss()],  // ← Add vue() plugin
  // ...
})
```

Without this, you'll get: `"Install @vitejs/plugin-vue to handle .vue files"`

## Canvas Drag/Draw Tests in Vitest Browser Mode

Using `page.mouse` (Playwright's top-level mouse API) to simulate drags on canvas elements **fails silently** in Vitest browser mode. The test iframe introduces coordinate mismatches:

1. `frame.locator().boundingBox()` returns page-level coordinates
2. But the iframe may have different scaling than the page viewport
3. Mouse events dispatched at page coordinates miss the canvas inside the iframe

**Symptom:** Pointer events never reach the canvas, `pointerdown` handlers don't fire, tool state doesn't update.

**Solution:** Dispatch `PointerEvent`s directly within the iframe using `frame.evaluate`:

```ts
// ✅ Works: dispatch events inside the iframe
const canvasDrag: BrowserCommand<[...]> = async (ctx, selector, startX, startY, endX, endY, options) => {
  const frame = await ctx.frame()

  await frame.evaluate(({ sel, sx, sy, ex, ey }) => {
    const el = document.querySelector(sel)!
    const rect = el.getBoundingClientRect()

    function fire(type: string, x: number, y: number): void {
      el.dispatchEvent(new PointerEvent(type, {
        clientX: rect.left + x,
        clientY: rect.top + y,
        button: 0,
        buttons: type === 'pointerup' ? 0 : 1,
        bubbles: true,
        pointerId: 1,
        pointerType: 'mouse',
      }))
    }

    fire('pointerdown', sx, sy)
    fire('pointermove', ex, ey)
    fire('pointerup', ex, ey)
  }, { sel: selector, sx: startX, sy: startY, ex: endX, ey: endY })
}

// ❌ Fails: page.mouse coordinates don't map correctly into iframe
await ctx.page.mouse.move(pageX, pageY)
await ctx.page.mouse.down()
```

See `app/__test-utils__/commands/canvasDrag.ts` for the full implementation.
