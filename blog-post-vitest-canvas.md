# Testing Canvas Apps with Vitest Browser Mode

You can't `getByRole('rectangle')` on a canvas. There's no DOM tree, no accessible nodes -- just pixels on a bitmap. That makes canvas apps fundamentally harder to test than anything DOM-based.

I'm building an Excalidraw-like drawing app with Nuxt and Vue, mostly with AI coding tools. Without strong tests as back pressure, AI-assisted coding is just vibes. Tests define what "correct" looks like and catch drift before it compounds.

I needed real canvas tests. Here's how I got there.

## How Excalidraw Does It

Excalidraw's test suite runs in jsdom with `vitest-canvas-mock`. The canvas 2D context is completely mocked -- calls like `fillRect()` and `stroke()` are no-ops. Nothing renders.

They mock roughly ten browser APIs: `FontFace`, `matchMedia`, `setPointerCapture`, `ResizeObserver`, `IndexedDB`, `ClipboardEvent`, `DataTransfer`, `getBoundingClientRect`, `HTMLImageElement`. Every API the canvas rendering pipeline touches gets a stub.

This lets them test interaction logic -- pointer events, keyboard shortcuts, state transitions. It's fast. But you're testing in a simulated environment that has no eyes. You can verify a rectangle was added to the elements array, but not that it actually shows up on screen.

## Real Browser, Real Pixels

Our approach: Vitest browser mode with Playwright. Tests run in actual Chromium -- real canvas, real rendering pipeline, real pointer events.

The config:

```typescript
// vitest.config.browser.ts
export default defineConfig({
  test: {
    include: ["app/**/*.browser.test.ts"],
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: "chromium" }],
      commands: { canvasDrag, canvasClick, canvasDblClick },
    },
  },
});
```

Custom commands are the key ingredient.

## The Iframe Trap

Vitest browser mode renders your component inside an iframe. This is where most people get stuck.

`page.mouse` from Playwright uses coordinates relative to the outer page, not the iframe viewport. Your canvas clicks land in the wrong spot. The drag fires and... nothing happens. No error. No element created. Silent failure.

I burned hours on this. The fix: custom browser commands that use `frame.evaluate()` to dispatch PointerEvents directly inside the iframe.

```typescript
export const canvasDrag: BrowserCommand<[...]> = async (
  ctx, selector, startX, startY, endX, endY, options,
) => {
  const frame = await ctx.frame()
  const steps = options?.steps ?? 5

  await frame.evaluate(({ sel, sx, sy, ex, ey, s }) => {
    const el = document.querySelector(sel)
    const rect = el.getBoundingClientRect()

    function fire(type: string, x: number, y: number) {
      el.dispatchEvent(new PointerEvent(type, {
        clientX: rect.left + x,
        clientY: rect.top + y,
        bubbles: true,
        pointerId: 1,
        pointerType: 'mouse',
      }))
    }

    fire('pointerdown', sx, sy)
    for (let i = 1; i <= s; i++) {
      const t = i / s
      fire('pointermove', sx + (ex - sx) * t, sy + (ey - sy) * t)
    }
    fire('pointerup', ex, ey)
  }, { sel: selector, sx: startX, sy: startY, ex: endX, ey: endY, s: steps })
}
```

This dispatches `pointerdown -> pointermove (N steps) -> pointerup` with coordinates relative to the canvas element. The app sees the same events it would from a real user.

## Layered Abstractions

Raw pixel coordinates in every test would be unreadable. We built layers on top of the custom commands, each one higher-level than the last.

**Browser Commands** -- `canvasDrag`, `canvasClick`, `canvasDblClick`. Solve the iframe problem. Everything else builds on them.

**Pointer and Keyboard** -- Track cursor state and manage modifier keys. `Pointer` remembers its position for `dragBy(dx, dy)` relative movements. `Keyboard` handles modifier key scoping:

```typescript
await keyboard.withModifierKeys({ shiftKey: true }, async () => {
  await pointer.clickOn(element);
});
```

**CanvasGrid** -- The biggest readability win. Instead of magic pixel numbers, you work with a 16x9 logical grid that auto-detects canvas dimensions and maps cell coordinates to pixels.

```typescript
// Instead of: canvasDrag('canvas', 320, 180, 640, 360)
await grid.drag([4, 2], [8, 4]);
```

Tests read like intent, not pixel math. Grid cells are stable across viewport sizes because they're proportional.

**API** -- Direct state access via `globalThis.__h`, a test hook our canvas component exposes (same pattern as Excalidraw's `window.h`). Read elements, check selection, get the active tool -- bypassing the rendering layer.

```typescript
expect(API.elements).toHaveLength(1);
expect(API.elements[0].type).toBe("rectangle");
expect(API.activeTool).toBe("selection");
```

**UI** -- The composition layer. Combines tool selection, pointer interaction, grid coordinates, and state verification into high-level operations:

```typescript
const rect = await ui.createElement("rectangle", [2, 2], [5, 5]);
// Returns a live accessor -- rect.get() always reflects current state
```

A real test using all of this:

```typescript
it("selects element by clicking on it", async () => {
  const screen = render(CanvasContainer);
  await waitForCanvasReady();
  const ui = new UI(screen);

  const rect = await ui.createElement("rectangle", [2, 2], [5, 5]);
  API.clearSelection();
  await waitForPaint();

  await ui.grid.clickCenter([2, 2], [5, 5]);
  assertSelectedElements(rect.id);
});
```

The abstractions carry the weight.

## Screenshot Testing

Running in a real browser unlocks visual regression testing.

```typescript
it("renders a rectangle", async () => {
  render(CanvasContainer);
  await waitForCanvasReady();

  await userEvent.keyboard("2");
  await commands.canvasDrag(CANVAS_SELECTOR, 100, 100, 300, 250);

  await expect(page.getByTestId("canvas-container")).toMatchScreenshot("single-rectangle");
});
```

Excalidraw can't do this -- their canvas is mocked, no pixels to screenshot. We catch rendering regressions in shapes, selection handles, theme changes, and element compositing.

RoughJS uses `Math.random()` for its hand-drawn stroke variations, which would make screenshots non-deterministic. We seed it:

```typescript
beforeEach(() => reseed());
afterEach(() => restoreSeed());
```

Screenshots are now pixel-identical across runs.

## The Comparison

|                         | Excalidraw (jsdom + mocks)           | Our Approach (Vitest Browser Mode)   |
| ----------------------- | ------------------------------------ | ------------------------------------ |
| **Environment**         | jsdom, no real browser               | Real Chromium via Playwright         |
| **Canvas**              | Completely mocked (no-ops)           | Real canvas, real pixels             |
| **Speed**               | Hundreds of tests in seconds         | Slower (browser startup + rendering) |
| **Visual testing**      | Impossible                           | Screenshot regression testing        |
| **Browser APIs mocked** | ~10 (FontFace, ResizeObserver, etc.) | Zero                                 |
| **Confidence**          | High for logic, zero for rendering   | High for both                        |

Fast but blind vs. slower but sees.

## The Tradeoff

Yes, browser tests are slower. Chromium has to start, the component has to mount, the canvas pipeline has to bootstrap.

But they catch bugs that jsdom tests are structurally blind to. Elements offset by 10 pixels. Theme changes that don't propagate to the canvas background. Selection handles rendering behind elements instead of in front. These bugs pass every jsdom test and break in production.

For AI-assisted development, this matters even more. When an AI refactors your rendering pipeline, you want tests that verify the output, not just the inputs. Screenshot tests give it a pixel-perfect target to match.

The setup cost is real but front-loaded. Custom commands once, abstraction layers once, and every test after that is five lines of readable intent. The investment pays for itself fast.
