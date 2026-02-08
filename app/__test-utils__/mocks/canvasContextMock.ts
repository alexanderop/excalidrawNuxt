interface CanvasCallRecord {
  method: string
  args: unknown[]
}

export function createCanvasContextMock(): {
  ctx: CanvasRenderingContext2D
  calls: CanvasCallRecord[]
  getCallsFor: (method: string) => CanvasCallRecord[]
  reset: () => void
} {
  const calls: CanvasCallRecord[] = []
  const properties = new Map<string, unknown>()

  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      const key = String(prop)
      if (key === 'toJSON' || key === 'then') return undefined
      if (properties.has(key)) return properties.get(key)
      // Return a function that records calls
      return (...args: unknown[]) => {
        calls.push({ method: key, args })
      }
    },
    set(_target, prop, value) {
      const key = String(prop)
      properties.set(key, value)
      calls.push({ method: `set:${key}`, args: [value] })
      return true
    },
  }

  const ctx = new Proxy({}, handler) as unknown as CanvasRenderingContext2D

  return {
    ctx,
    calls,
    getCallsFor: (method: string) => calls.filter(c => c.method === method),
    reset: () => { calls.length = 0; properties.clear() },
  }
}
