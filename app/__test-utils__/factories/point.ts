import type { Point } from '~/shared/math'

export function createTestPoint(overrides: Partial<Point> = {}): Point {
  return { x: 0, y: 0, ...overrides }
}
