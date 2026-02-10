type EventHandler = (...args: unknown[]) => void

interface EventHandlerMap {
  /** The mock useEventListener function to use in vi.mock */
  mockUseEventListener: (_target: unknown, event: string, handler: EventHandler) => void
  /** The mock onKeyStroke function — registers a keydown handler that filters by key */
  mockOnKeyStroke: (
    key: string | string[],
    handler: EventHandler,
    options?: { eventName?: string; target?: unknown; dedupe?: boolean },
  ) => void
  /** Fire a pointer event (pointerdown/pointermove/pointerup) */
  firePointer: (
    type: 'pointerdown' | 'pointermove' | 'pointerup',
    x: number,
    y: number,
    opts?: { shiftKey?: boolean; button?: number },
  ) => void
  /** Fire any event type with custom overrides */
  fire: (type: string, overrides?: Record<string, unknown>) => void
  /** Clear all registered handlers */
  clear: () => void
}

export function createEventHandlerMap(
  handlers = new Map<string, EventHandler[]>(),
): EventHandlerMap {

  function mockUseEventListener(_target: unknown, event: string, handler: EventHandler): void {
    const existing = handlers.get(event) ?? []
    existing.push(handler)
    handlers.set(event, existing)
  }

  function mockOnKeyStroke(
    key: string | string[],
    handler: EventHandler,
    options?: { eventName?: string; target?: unknown; dedupe?: boolean },
  ): void {
    const eventName = options?.eventName ?? 'keydown'
    const keys = Array.isArray(key) ? key : [key]

    const wrappedHandler: EventHandler = (...args: unknown[]) => {
      const e = args[0] as { key?: string }
      if (e.key && keys.includes(e.key)) {
        handler(...args)
      }
    }

    mockUseEventListener(null, eventName, wrappedHandler)
  }

  function firePointer(
    type: 'pointerdown' | 'pointermove' | 'pointerup',
    x: number,
    y: number,
    opts: { shiftKey?: boolean; button?: number } = {},
  ): void {
    const registered = handlers.get(type)
    if (!registered?.length) throw new Error(`No handler for ${type}`)
    const event = {
      offsetX: x,
      offsetY: y,
      pointerId: 1,
      button: opts.button ?? 0,
      shiftKey: opts.shiftKey ?? false,
    }
    for (const handler of registered) {
      handler(event)
    }
  }

  function fire(type: string, overrides: Record<string, unknown> = {}): void {
    const registered = handlers.get(type)
    if (!registered?.length) throw new Error(`No handler for ${type}`)
    const event = {
      offsetX: 0,
      offsetY: 0,
      pointerId: 1,
      button: 0,
      shiftKey: false,
      preventDefault: vi.fn(),
      ...overrides,
    }
    for (const handler of registered) {
      handler(event)
    }
  }

  function clear(): void {
    handlers.clear()
  }

  return { mockUseEventListener, mockOnKeyStroke, firePointer, fire, clear }
}
