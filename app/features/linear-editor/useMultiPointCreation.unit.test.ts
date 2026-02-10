import { shallowRef } from 'vue'
import { withSetup } from '~/__test-utils__/withSetup'
import { createTestArrowElement } from '~/__test-utils__/factories/element'
import { createEventHandlerMap } from '~/__test-utils__/mocks/eventListenerMock'
import { createCanvasStub } from '~/__test-utils__/mocks/canvasStub'
import { pointFrom } from '~/shared/math'
import type { LocalPoint, GlobalPoint } from '~/shared/math'
import type { ExcalidrawElement } from '~/features/elements/types'
import { useMultiPointCreation } from './useMultiPointCreation'

type EventHandler = (...args: unknown[]) => void
const { handlers, mockUseEventListener, mockOnKeyStroke } = vi.hoisted(() => {
  const handlers = new Map<string, EventHandler[]>()
  const mockUseEventListener = (_target: unknown, event: string, handler: EventHandler): void => {
    const existing = handlers.get(event) ?? []
    existing.push(handler)
    handlers.set(event, existing)
  }
  const mockOnKeyStroke = (
    key: string | string[],
    handler: EventHandler,
    options?: { eventName?: string; target?: unknown; dedupe?: boolean },
  ): void => {
    const eventName = options?.eventName ?? 'keydown'
    const keys = Array.isArray(key) ? key : [key]
    const wrappedHandler: EventHandler = (...args: unknown[]) => {
      const e = args[0] as { key?: string }
      if (e.key && keys.includes(e.key)) handler(...args)
    }
    mockUseEventListener(null, eventName, wrappedHandler)
  }
  return { handlers, mockUseEventListener, mockOnKeyStroke }
})
const { fire, clear } = createEventHandlerMap(handlers)

// Stub document for SSR guard in composables
vi.stubGlobal('document', {})

vi.mock('@vueuse/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@vueuse/core')>()
  return { ...actual, useEventListener: mockUseEventListener, onKeyStroke: mockOnKeyStroke }
})

function createSetup() {
  return {
    canvasRef: shallowRef<HTMLCanvasElement | null>(createCanvasStub()),
    toScene: (x: number, y: number) => pointFrom<GlobalPoint>(x, y),
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
  beforeEach(() => { clear() })

  it('starts multi-point mode and sets multiElement', () => {
    const opts = createSetup()
    using ctx = withSetup(() => useMultiPointCreation(opts))

    const arrow = createTestArrowElement({
      x: 10, y: 20,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(50, 30)],
    })
    ctx.startMultiPoint(arrow)

    expect(ctx.multiElement.value).toBe(arrow)
    expect(ctx.lastCursorPoint.value).toEqual([60, 50])
  })

  it('adds a new point on click', () => {
    const opts = createSetup()
    using ctx = withSetup(() => useMultiPointCreation(opts))

    const arrow = createTestArrowElement({
      x: 0, y: 0,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 0)],
    })
    ctx.startMultiPoint(arrow)

    fire('pointerdown', { offsetX: 100, offsetY: 50, button: 0 })

    expect(arrow.points).toHaveLength(3)
    expect(arrow.points[2]).toEqual([100, 50])
    expect(opts.markStaticDirty).toHaveBeenCalled()
  })

  it('updates cursor position on pointermove', () => {
    const opts = createSetup()
    using ctx = withSetup(() => useMultiPointCreation(opts))

    const arrow = createTestArrowElement({
      x: 0, y: 0,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 0)],
    })
    ctx.startMultiPoint(arrow)

    fire('pointermove', { offsetX: 200, offsetY: 100 })

    expect(ctx.lastCursorPoint.value).toEqual([200, 100])
    expect(opts.markInteractiveDirty).toHaveBeenCalled()
  })

  it('finalizes on Escape', () => {
    const opts = createSetup()
    using ctx = withSetup(() => useMultiPointCreation(opts))

    const arrow = createTestArrowElement({
      x: 0, y: 0,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 0)],
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
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 0)],
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
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 0)],
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
