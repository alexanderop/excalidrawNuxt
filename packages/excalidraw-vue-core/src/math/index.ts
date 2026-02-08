// Re-export point operations from @excalidraw/math
export {
  pointFrom,
  pointFromArray,
  pointFromPair,
  pointCenter,
  pointDistance,
  pointDistanceSq,
  pointRotateRads,
  pointsEqual,
  isPoint,
  pointTranslate,
  pointScaleFromOrigin,
  isPointWithinBounds,
} from '@excalidraw/math'

// Re-export segment operations
export { distanceToLineSegment, lineSegment } from '@excalidraw/math'

// Re-export angle operations
export { degreesToRadians, normalizeRadians } from '@excalidraw/math'

// Re-export utility operations
export { clamp, round, average, isCloseTo, PRECISION } from '@excalidraw/math'

// Re-export types
export type {
  GlobalPoint,
  LocalPoint,
  Radians,
  Degrees,
  LineSegment,
  Vector,
} from '@excalidraw/math'

// Project-specific brand helpers
export { radiansFrom } from './brand'
