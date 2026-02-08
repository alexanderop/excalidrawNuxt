export function roundFloats(value: unknown, precision = 5): unknown {
  if (typeof value === 'number') {
    return Number(value.toFixed(precision))
  }
  if (Array.isArray(value)) {
    return value.map(v => roundFloats(v, precision))
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      result[k] = roundFloats(v, precision)
    }
    return result
  }
  return value
}
