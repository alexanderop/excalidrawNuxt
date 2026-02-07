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
