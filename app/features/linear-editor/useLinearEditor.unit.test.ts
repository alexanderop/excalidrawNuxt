import { shallowRef } from 'vue'
import { withSetup } from '~/__test-utils__/withSetup'
import { createTestArrowElement } from '~/__test-utils__/factories/element'
import { createEventHandlerMap } from '~/__test-utils__/mocks/eventListenerMock'
import { createCanvasStub } from '~/__test-utils__/mocks/canvasStub'
import { pointFrom } from '~/shared/math'
import type { LocalPoint, GlobalPoint } from '~/shared/math'
import type { ExcalidrawElement } from '~/features/elements/types'
import { useLinearEditor } from './useLinearEditor'

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
    zoom: shallowRef(1),
    toScene: (x: number, y: number) => pointFrom<GlobalPoint>(x, y),
    markStaticDirty: vi.fn(),
    markInteractiveDirty: vi.fn(),
    select: vi.fn(),
    elements: shallowRef<readonly ExcalidrawElement[]>([]),
    suggestedBindings: shallowRef<readonly ExcalidrawElement[]>([]),
  }
}

describe('useLinearEditor', () => {
  // eslint-disable-next-line vitest/no-hooks -- clearing shared event handler map between tests
  beforeEach(() => { clear() })

  it('enters editor mode and selects the element', () => {
    const opts = createSetup()
    using ctx = withSetup(() => useLinearEditor(opts))

    const arrow = createTestArrowElement({
      x: 0, y: 0,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 0)],
    })

    ctx.enterEditor(arrow)

    expect(ctx.editingElement.value).toBe(arrow)
    expect(opts.select).toHaveBeenCalledWith(arrow.id)
    expect(opts.markInteractiveDirty).toHaveBeenCalled()
  })

  it('exits editor mode on Escape', () => {
    const opts = createSetup()
    using ctx = withSetup(() => useLinearEditor(opts))

    const arrow = createTestArrowElement({
      x: 0, y: 0,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 0)],
    })

    ctx.enterEditor(arrow)
    opts.markInteractiveDirty.mockClear()

    fire('keydown', { key: 'Escape' })

    expect(ctx.editingElement.value).toBeNull()
    expect(ctx.selectedPointIndices.value.size).toBe(0)
    expect(opts.markInteractiveDirty).toHaveBeenCalled()
  })

  it('selects a point on click', () => {
    const opts = createSetup()
    using ctx = withSetup(() => useLinearEditor(opts))

    const arrow = createTestArrowElement({
      x: 0, y: 0,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 0)],
    })

    ctx.enterEditor(arrow)

    // Click near point[0] at (0, 0)
    fire('pointerdown', { offsetX: 0, offsetY: 0, button: 0 })

    expect(ctx.selectedPointIndices.value.has(0)).toBe(true)
  })

  it('drags a selected point', () => {
    const opts = createSetup()
    using ctx = withSetup(() => useLinearEditor(opts))

    const arrow = createTestArrowElement({
      x: 0, y: 0,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 0)],
    })

    ctx.enterEditor(arrow)

    // Click point[1] at (100, 0) to select it
    fire('pointerdown', { offsetX: 100, offsetY: 0, button: 0 })
    expect(ctx.selectedPointIndices.value.has(1)).toBe(true)

    // Drag it
    fire('pointermove', { offsetX: 120, offsetY: 10 })

    // Point should have moved
    expect(arrow.points[1]![0]).toBe(120)
    expect(arrow.points[1]![1]).toBe(10)
    expect(opts.markStaticDirty).toHaveBeenCalled()
  })

  it('exits editor when clicking empty space', () => {
    const opts = createSetup()
    using ctx = withSetup(() => useLinearEditor(opts))

    const arrow = createTestArrowElement({
      x: 0, y: 0,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 0)],
    })

    ctx.enterEditor(arrow)

    // Click far from any point or midpoint
    fire('pointerdown', { offsetX: 500, offsetY: 500, button: 0 })

    expect(ctx.editingElement.value).toBeNull()
  })

  it('deletes selected points with Delete key', () => {
    const opts = createSetup()
    using ctx = withSetup(() => useLinearEditor(opts))

    const arrow = createTestArrowElement({
      x: 0, y: 0,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(50, 0), pointFrom<LocalPoint>(100, 0)],
    })

    ctx.enterEditor(arrow)

    // Select middle point
    fire('pointerdown', { offsetX: 50, offsetY: 0, button: 0 })
    fire('pointerup', { pointerId: 1 })

    expect(ctx.selectedPointIndices.value.has(1)).toBe(true)

    fire('keydown', { key: 'Delete' })

    expect(arrow.points).toHaveLength(2)
    expect(ctx.selectedPointIndices.value.size).toBe(0)
  })

  it('does not delete if only 2 points remain', () => {
    const opts = createSetup()
    using ctx = withSetup(() => useLinearEditor(opts))

    const arrow = createTestArrowElement({
      x: 0, y: 0,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 0)],
    })

    ctx.enterEditor(arrow)

    // Select a point
    fire('pointerdown', { offsetX: 0, offsetY: 0, button: 0 })
    fire('pointerup', { pointerId: 1 })

    fire('keydown', { key: 'Delete' })

    // Should still have 2 points
    expect(arrow.points).toHaveLength(2)
  })

  it('shift-click toggles multi-select', () => {
    const opts = createSetup()
    using ctx = withSetup(() => useLinearEditor(opts))

    const arrow = createTestArrowElement({
      x: 0, y: 0,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(50, 0), pointFrom<LocalPoint>(100, 0)],
    })

    ctx.enterEditor(arrow)

    // Select point[0]
    fire('pointerdown', { offsetX: 0, offsetY: 0, button: 0 })
    fire('pointerup', { pointerId: 1 })

    expect(ctx.selectedPointIndices.value.has(0)).toBe(true)
    expect(ctx.selectedPointIndices.value.size).toBe(1)

    // Shift-click point[2] to add to selection
    fire('pointerdown', { offsetX: 100, offsetY: 0, button: 0, shiftKey: true })
    fire('pointerup', { pointerId: 1 })

    expect(ctx.selectedPointIndices.value.has(0)).toBe(true)
    expect(ctx.selectedPointIndices.value.has(2)).toBe(true)
    expect(ctx.selectedPointIndices.value.size).toBe(2)
  })

  it('ignores events when not in editor mode', () => {
    const opts = createSetup()
    using _ctx = withSetup(() => useLinearEditor(opts))

    // These should not throw
    fire('pointerdown', { offsetX: 0, offsetY: 0, button: 0 })
    fire('pointermove', { offsetX: 10, offsetY: 10 })
    fire('pointerup', { pointerId: 1 })
    fire('keydown', { key: 'Delete' })

    expect(opts.markStaticDirty).not.toHaveBeenCalled()
  })
})
