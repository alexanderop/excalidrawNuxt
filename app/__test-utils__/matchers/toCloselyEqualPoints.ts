import { expect } from 'vitest'

expect.extend({
  toCloselyEqualPoints(
    received: readonly [number, number][],
    expected: readonly [number, number][],
    precision = 2,
  ) {
    const threshold = 10 ** -precision
    const pass = expected.every(
      (point, idx) => {
        const recv = received[idx]
        if (!recv) return false
        return (
          Math.abs(recv[0] - point[0]) < threshold
          && Math.abs(recv[1] - point[1]) < threshold
        )
      },
    )
    return {
      pass,
      message: () => pass
        ? `expected points to NOT closely equal ${JSON.stringify(expected)}`
        : `expected points to closely equal\n`
          + `  Expected: ${JSON.stringify(expected)}\n`
          + `  Received: ${JSON.stringify(received)}`,
    }
  },
})

declare module 'vitest' {
  interface Assertion {
    toCloselyEqualPoints(expected: readonly [number, number][], precision?: number): void
  }
}
