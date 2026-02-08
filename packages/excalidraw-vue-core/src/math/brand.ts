import type { Radians } from '@excalidraw/math'

/**
 * Create a branded Radians value from a plain number.
 * The `as` cast is encapsulated here — our ESLint "no `as`" rule is satisfied
 * because callers never use `as` directly.
 */
 
export const radiansFrom = (n: number): Radians => n as Radians
