# Testing Conventions

## Philosophy

Two core principles:

1. **Flat tests** — each `it()` is self-contained with no shared mutable state via `beforeEach`/`afterEach` hooks (Kent C. Dodds, "Avoid Nesting When You're Testing")
2. **Disposable objects** — `using` keyword + `Symbol.dispose` guarantees cleanup even when assertions throw (Artem Zakharchenko, "`using` in tests")

## `withSetup` API

```ts
import { withSetup } from '~/__test-utils__/withSetup'

// Returns T & Disposable — use with `using` for automatic cleanup
using vp = withSetup(() => useViewport())
expect(vp.scrollX.value).toBe(0)
// scope.stop() called automatically at block exit, even on throw
```

**Signature**: `withSetup<T extends object>(composable: () => T): T & Disposable`

- Wraps the composable in a Vue `effectScope`
- Returns the composable result merged with `Symbol.dispose` for automatic scope cleanup
- TypeScript 5.2+ with `lib: ["ESNext"]` required for `using`/`Disposable`

## When `describe` is OK

Use `describe` for **output organization only** — grouping related tests under a label. Never use it to share mutable state.

```ts
// GOOD: describe for grouping, no shared state
describe('panBy', () => {
  it('adjusts scroll by dx and dy', () => {
    using vp = withSetup(() => useViewport())
    vp.panBy(100, 50)
    expect(vp.scrollX.value).toBe(100)
  })
})
```

## When hooks are OK

| Hook | Unit tests (`*.unit.test.ts`) | Browser tests (`*.browser.test.ts`) |
|------|-------------------------------|-------------------------------------|
| `beforeEach` / `afterEach` | Warn (ESLint `vitest/no-hooks`) | Allowed |
| `beforeAll` / `afterAll` | Allowed (one-time expensive setup) | Allowed |

## Pure function tests

For stateless pure functions (no composable, no reactive state), just call the function directly — no `withSetup` or `using` needed:

```ts
it('clamps value to range', () => {
  expect(clamp(15, 0, 10)).toBe(10)
})
```

For tests that need cache/state reset (e.g. `shapeGenerator`), call the reset function inline at the start of each test:

```ts
it('generates a drawable for a rectangle', () => {
  clearShapeCache()
  const drawable = generateShape(createTestElement({ type: 'rectangle' }))
  expect(drawable.shape).toBe('rectangle')
})
```

## ESLint Enforcement

The `app/vitest-unit-flat-tests` config warns on `beforeEach`/`afterEach` in `*.unit.test.ts` files. Browser tests are unaffected. Severity is `warn` to allow escape hatches.
