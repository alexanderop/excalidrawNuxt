import { shallowRef } from 'vue'
import { withSetup } from '~/__test-utils__/withSetup'
import type { ExcalidrawElement } from '~/features/elements/types'
import { useDrawingInteraction } from './useDrawingInteraction'
import type { ToolType } from './types'

type EventHandler = (...args: unknown[]) => void

// Capture event handlers registered by useEventListener
const eventHandlers = new Map<string, EventHandler>()

vi.mock('@vueuse/core', () => ({
  useEventListener: (_target: unknown, event: string, handler: EventHandler) => {
    eventHandlers.set(event, handler)
  },
}))

function firePointer(type: 'pointerdown' | 'pointermove' | 'pointerup', x: number, y: number) {
  const handler = eventHandlers.get(type)
  if (!handler) throw new Error(`No handler for ${type}`)
  handler({ offsetX: x, offsetY: y, pointerId: 1, button: 0, shiftKey: false })
}

function createCanvasStub(): HTMLCanvasElement {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- test stub
  return {
    setPointerCapture: vi.fn(),
    releasePointerCapture: vi.fn(),
  } as unknown as HTMLCanvasElement
}

function createSetup() {
  const canvasRef = shallowRef<HTMLCanvasElement | null>(createCanvasStub())
  const activeTool = shallowRef<ToolType>('rectangle')
  const onElementCreated = vi.fn()
  const markNewElementDirty = vi.fn()
  const markStaticDirty = vi.fn()
  const markInteractiveDirty = vi.fn()

  return {
    canvasRef,
    activeTool,
    setTool: (tool: ToolType) => { activeTool.value = tool },
    spaceHeld: shallowRef(false),
    isPanning: shallowRef(false),
    toScene: (x: number, y: number) => ({ x, y }),
    onElementCreated,
    markNewElementDirty,
    markStaticDirty,
    markInteractiveDirty,
    elements: shallowRef<readonly ExcalidrawElement[]>([]),
    zoom: shallowRef(1),
    suggestedBindings: shallowRef<readonly ExcalidrawElement[]>([]),
  }
}

describe('useDrawingInteraction', () => {
  it('clears new-element canvas after drawing completes (no ghost element)', () => {
    eventHandlers.clear()
    const opts = createSetup()

    using _ctx = withSetup(() => useDrawingInteraction(opts))

    // Draw: pointerdown → pointermove → pointerup
    firePointer('pointerdown', 100, 100)
    firePointer('pointermove', 200, 200)

    opts.markNewElementDirty.mockClear()

    firePointer('pointerup', 200, 200)

    // markNewElementDirty MUST be called on pointerup to clear the ghost
    expect(opts.markNewElementDirty).toHaveBeenCalled()
  })

  it('creates exactly one element after draw-then-release', () => {
    eventHandlers.clear()
    const opts = createSetup()

    using ctx = withSetup(() => useDrawingInteraction(opts))

    // Draw a rectangle
    firePointer('pointerdown', 50, 50)
    firePointer('pointermove', 150, 150)
    firePointer('pointerup', 150, 150)

    expect(opts.onElementCreated).toHaveBeenCalledTimes(1)

    const created = opts.onElementCreated.mock.calls[0]![0]
    expect(created.x).toBe(50)
    expect(created.y).toBe(50)
    expect(created.width).toBe(100)
    expect(created.height).toBe(100)

    // newElement should be null after drawing finishes
    expect(ctx.newElement.value).toBeNull()
  })

  it('switches to selection tool after drawing', () => {
    eventHandlers.clear()
    const opts = createSetup()

    using _ctx = withSetup(() => useDrawingInteraction(opts))

    expect(opts.activeTool.value).toBe('rectangle')

    firePointer('pointerdown', 10, 10)
    firePointer('pointermove', 110, 110)
    firePointer('pointerup', 110, 110)

    expect(opts.activeTool.value).toBe('selection')
  })
})
