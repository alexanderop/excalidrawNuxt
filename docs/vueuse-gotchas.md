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

**Solution:** Dispatch `PointerEvent`s directly within the iframe using `frame.evaluate`. The low-level command lives in `app/__test-utils__/commands/canvasDrag.ts`.

Tests should use the higher-level helpers which wrap these commands:

```ts
// ✅ Use the Pointer/UI/API helpers from app/__test-utils__/browser/
import { Pointer, UI, API, waitForPaint } from '~/app/__test-utils__/browser'

const ui = new UI(screen)
await ui.clickTool('rectangle')
await ui.pointer.drag(100, 100, 300, 200)
await waitForPaint()

const el = API.elements.at(-1)
```

The `API` object provides programmatic access to app state via `globalThis.__h` (the test hook exposed by `CanvasContainer.vue`). This follows Excalidraw's `window.h` pattern.

```ts
// ❌ Fails: page.mouse coordinates don't map correctly into iframe
await ctx.page.mouse.move(pageX, pageY)
await ctx.page.mouse.down()
```
