import { shallowRef } from 'vue'
import { withSetup } from '~/__test-utils__/withSetup'
import { createTestArrowElement } from '~/__test-utils__/factories/element'
import { createPoint } from '~/shared/math'
import type { ExcalidrawElement } from '~/features/elements/types'
import { useMultiPointCreation } from './useMultiPointCreation'

type EventHandler = (...args: unknown[]) => void

const eventHandlers = new Map<string, EventHandler[]>()

// Stub document for SSR guard in composables
vi.stubGlobal('document', {})

vi.mock('@vueuse/core', () => ({
  useEventListener: (_target: unknown, event: string, handler: EventHandler) => {
    const handlers = eventHandlers.get(event) ?? []
    handlers.push(handler)
    eventHandlers.set(event, handlers)
  },
}))

function fire(type: string, overrides: Record<string, unknown> = {}) {
  const handlers = eventHandlers.get(type)
  if (!handlers?.length) throw new Error(`No handler for ${type}`)
  const e = { offsetX: 0, offsetY: 0, pointerId: 1, button: 0, shiftKey: false, preventDefault: vi.fn(), ...overrides }
  for (const handler of handlers) {
    handler(e)
  }
}

function createCanvasStub(): HTMLCanvasElement {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- test stub
  return {
    setPointerCapture: vi.fn(),
    releasePointerCapture: vi.fn(),
  } as unknown as HTMLCanvasElement
}

function createSetup() {
  return {
    canvasRef: shallowRef<HTMLCanvasElement | null>(createCanvasStub()),
    toScene: (x: number, y: number) => ({ x, y }),
    markStaticDirty: vi.fn(),
    markInteractiveDirty: vi.fn(),
    onFinalize: vi.fn(),
    elements: shallowRef<readonly ExcalidrawElement[]>([]),
    zoom: shallowRef(1),
    suggestedBindings: shallowRef<readonly ExcalidrawElement[]>([]),
  }
}

describe('useMultiPointCreation', () => {
  // eslint-disable-next-line vitest/no-hooks -- clearing shared event handler map between tests
  beforeEach(() => { eventHandlers.clear() })

  it('starts multi-point mode and sets multiElement', () => {
    const opts = createSetup()
    using ctx = withSetup(() => useMultiPointCreation(opts))

    const arrow = createTestArrowElement({
      x: 10, y: 20,
      points: [createPoint(0, 0), createPoint(50, 30)],
    })
    ctx.startMultiPoint(arrow)

    expect(ctx.multiElement.value).toBe(arrow)
    expect(ctx.lastCursorPoint.value).toEqual({ x: 60, y: 50 })
  })

  it('adds a new point on click', () => {
    const opts = createSetup()
    using ctx = withSetup(() => useMultiPointCreation(opts))

    const arrow = createTestArrowElement({
      x: 0, y: 0,
      points: [createPoint(0, 0), createPoint(100, 0)],
    })
    ctx.startMultiPoint(arrow)

    fire('pointerdown', { offsetX: 100, offsetY: 50, button: 0 })

    expect(arrow.points).toHaveLength(3)
    expect(arrow.points[2]).toEqual({ x: 100, y: 50 })
    expect(opts.markStaticDirty).toHaveBeenCalled()
  })

  it('updates cursor position on pointermove', () => {
    const opts = createSetup()
    using ctx = withSetup(() => useMultiPointCreation(opts))

    const arrow = createTestArrowElement({
      x: 0, y: 0,
      points: [createPoint(0, 0), createPoint(100, 0)],
    })
    ctx.startMultiPoint(arrow)

    fire('pointermove', { offsetX: 200, offsetY: 100 })

    expect(ctx.lastCursorPoint.value).toEqual({ x: 200, y: 100 })
    expect(opts.markInteractiveDirty).toHaveBeenCalled()
  })

  it('finalizes on Escape', () => {
    const opts = createSetup()
    using ctx = withSetup(() => useMultiPointCreation(opts))

    const arrow = createTestArrowElement({
      x: 0, y: 0,
      points: [createPoint(0, 0), createPoint(100, 0)],
    })
    ctx.startMultiPoint(arrow)

    fire('keydown', { key: 'Escape' })

    expect(ctx.multiElement.value).toBeNull()
    expect(ctx.lastCursorPoint.value).toBeNull()
    expect(opts.onFinalize).toHaveBeenCalledOnce()
  })

  it('finalizes on Enter', () => {
    const opts = createSetup()
    using ctx = withSetup(() => useMultiPointCreation(opts))

    const arrow = createTestArrowElement({
      x: 0, y: 0,
      points: [createPoint(0, 0), createPoint(100, 0)],
    })
    ctx.startMultiPoint(arrow)

    fire('keydown', { key: 'Enter' })

    expect(ctx.multiElement.value).toBeNull()
    expect(opts.onFinalize).toHaveBeenCalledOnce()
  })

  it('finalizes on double-click', () => {
    const opts = createSetup()
    using ctx = withSetup(() => useMultiPointCreation(opts))

    const arrow = createTestArrowElement({
      x: 0, y: 0,
      points: [createPoint(0, 0), createPoint(100, 0)],
    })
    ctx.startMultiPoint(arrow)

    fire('dblclick')

    expect(ctx.multiElement.value).toBeNull()
    expect(opts.onFinalize).toHaveBeenCalledOnce()
  })

  it('ignores clicks when not in multi-point mode', () => {
    const opts = createSetup()
    using _ctx = withSetup(() => useMultiPointCreation(opts))

    fire('pointerdown', { offsetX: 100, offsetY: 50, button: 0 })

    // Should not throw and not call markStaticDirty
    expect(opts.markStaticDirty).not.toHaveBeenCalled()
  })
})
