import {
  TWO_PI,
  createPoint,
  distanceSq,
  distance,
  midpoint,
  clamp,
  lerp,
  lerpPoint,
  angleBetween,
  rotatePoint,
} from '~/shared/math'

describe('math utilities', () => {
  describe('TWO_PI', () => {
    it('equals Math.PI * 2', () => {
      expect(TWO_PI).toBe(Math.PI * 2)
    })
  })

  describe('createPoint', () => {
    it('creates a point with given coordinates', () => {
      const p = createPoint(3, 7)
      expect(p).toEqual({ x: 3, y: 7 })
    })

    it('handles negative coordinates', () => {
      const p = createPoint(-5, -10)
      expect(p).toEqual({ x: -5, y: -10 })
    })

    it('handles zero coordinates', () => {
      const p = createPoint(0, 0)
      expect(p).toEqual({ x: 0, y: 0 })
    })
  })

  describe('distanceSq', () => {
    it('returns 0 for identical points', () => {
      const p = { x: 3, y: 4 }
      expect(distanceSq(p, p)).toBe(0)
    })

    it('returns squared distance between two points', () => {
      const a = { x: 0, y: 0 }
      const b = { x: 3, y: 4 }
      expect(distanceSq(a, b)).toBe(25)
    })

    it('is commutative', () => {
      const a = { x: 1, y: 2 }
      const b = { x: 4, y: 6 }
      expect(distanceSq(a, b)).toBe(distanceSq(b, a))
    })

    it('handles negative coordinates', () => {
      const a = { x: -1, y: -1 }
      const b = { x: 2, y: 3 }
      expect(distanceSq(a, b)).toBe(25)
    })
  })

  describe('distance', () => {
    it('returns 0 for identical points', () => {
      const p = { x: 5, y: 5 }
      expect(distance(p, p)).toBe(0)
    })

    it('returns euclidean distance for a 3-4-5 triangle', () => {
      const a = { x: 0, y: 0 }
      const b = { x: 3, y: 4 }
      expect(distance(a, b)).toBe(5)
    })

    it('returns distance along x-axis', () => {
      const a = { x: 0, y: 0 }
      const b = { x: 7, y: 0 }
      expect(distance(a, b)).toBe(7)
    })

    it('returns distance along y-axis', () => {
      const a = { x: 0, y: 0 }
      const b = { x: 0, y: 9 }
      expect(distance(a, b)).toBe(9)
    })

    it('is commutative', () => {
      const a = { x: 1, y: 2 }
      const b = { x: 4, y: 6 }
      expect(distance(a, b)).toBe(distance(b, a))
    })
  })

  describe('midpoint', () => {
    it('returns the midpoint between two points', () => {
      const a = { x: 0, y: 0 }
      const b = { x: 10, y: 10 }
      expect(midpoint(a, b)).toEqual({ x: 5, y: 5 })
    })

    it('returns the same point when both inputs are identical', () => {
      const p = { x: 3, y: 7 }
      expect(midpoint(p, p)).toEqual({ x: 3, y: 7 })
    })

    it('handles negative coordinates', () => {
      const a = { x: -4, y: -6 }
      const b = { x: 4, y: 6 }
      expect(midpoint(a, b)).toEqual({ x: 0, y: 0 })
    })

    it('is commutative', () => {
      const a = { x: 1, y: 2 }
      const b = { x: 5, y: 8 }
      expect(midpoint(a, b)).toEqual(midpoint(b, a))
    })
  })

  describe('clamp', () => {
    it('returns value when within range', () => {
      expect(clamp(5, 0, 10)).toBe(5)
    })

    it('clamps to min when value is below', () => {
      expect(clamp(-5, 0, 10)).toBe(0)
    })

    it('clamps to max when value is above', () => {
      expect(clamp(15, 0, 10)).toBe(10)
    })

    it('returns min when value equals min', () => {
      expect(clamp(0, 0, 10)).toBe(0)
    })

    it('returns max when value equals max', () => {
      expect(clamp(10, 0, 10)).toBe(10)
    })

    it('handles negative ranges', () => {
      expect(clamp(-3, -5, -1)).toBe(-3)
      expect(clamp(-10, -5, -1)).toBe(-5)
      expect(clamp(0, -5, -1)).toBe(-1)
    })
  })

  describe('lerp', () => {
    it('returns a when t is 0', () => {
      expect(lerp(10, 20, 0)).toBe(10)
    })

    it('returns b when t is 1', () => {
      expect(lerp(10, 20, 1)).toBe(20)
    })

    it('returns midpoint when t is 0.5', () => {
      expect(lerp(0, 100, 0.5)).toBe(50)
    })

    it('extrapolates beyond 0-1 range', () => {
      expect(lerp(0, 10, 2)).toBe(20)
      expect(lerp(0, 10, -1)).toBe(-10)
    })
  })

  describe('lerpPoint', () => {
    it('returns point a when t is 0', () => {
      const a = { x: 0, y: 0 }
      const b = { x: 10, y: 10 }
      expect(lerpPoint(a, b, 0)).toEqual({ x: 0, y: 0 })
    })

    it('returns point b when t is 1', () => {
      const a = { x: 0, y: 0 }
      const b = { x: 10, y: 10 }
      expect(lerpPoint(a, b, 1)).toEqual({ x: 10, y: 10 })
    })

    it('returns midpoint when t is 0.5', () => {
      const a = { x: 0, y: 0 }
      const b = { x: 10, y: 20 }
      expect(lerpPoint(a, b, 0.5)).toEqual({ x: 5, y: 10 })
    })

    it('interpolates each axis independently', () => {
      const a = { x: 2, y: 8 }
      const b = { x: 6, y: 0 }
      const result = lerpPoint(a, b, 0.25)
      expect(result.x).toBe(3)
      expect(result.y).toBe(6)
    })
  })

  describe('angleBetween', () => {
    it('returns 0 for a point directly to the right', () => {
      const a = { x: 0, y: 0 }
      const b = { x: 10, y: 0 }
      expect(angleBetween(a, b)).toBe(0)
    })

    it('returns PI/2 for a point directly below', () => {
      const a = { x: 0, y: 0 }
      const b = { x: 0, y: 10 }
      expect(angleBetween(a, b)).toBeCloseTo(Math.PI / 2)
    })

    it('returns PI for a point directly to the left', () => {
      const a = { x: 0, y: 0 }
      const b = { x: -10, y: 0 }
      expect(angleBetween(a, b)).toBeCloseTo(Math.PI)
    })

    it('returns -PI/2 for a point directly above', () => {
      const a = { x: 0, y: 0 }
      const b = { x: 0, y: -10 }
      expect(angleBetween(a, b)).toBeCloseTo(-Math.PI / 2)
    })

    it('returns PI/4 for a 45-degree angle', () => {
      const a = { x: 0, y: 0 }
      const b = { x: 1, y: 1 }
      expect(angleBetween(a, b)).toBeCloseTo(Math.PI / 4)
    })
  })

  describe('rotatePoint', () => {
    it('returns the same point when angle is 0', () => {
      const point = { x: 5, y: 0 }
      const center = { x: 0, y: 0 }
      const result = rotatePoint(point, center, 0)
      expect(result.x).toBeCloseTo(5)
      expect(result.y).toBeCloseTo(0)
    })

    it('rotates 90 degrees counterclockwise', () => {
      const point = { x: 1, y: 0 }
      const center = { x: 0, y: 0 }
      const result = rotatePoint(point, center, Math.PI / 2)
      expect(result.x).toBeCloseTo(0)
      expect(result.y).toBeCloseTo(1)
    })

    it('rotates 180 degrees', () => {
      const point = { x: 1, y: 0 }
      const center = { x: 0, y: 0 }
      const result = rotatePoint(point, center, Math.PI)
      expect(result.x).toBeCloseTo(-1)
      expect(result.y).toBeCloseTo(0)
    })

    it('rotates around a non-origin center', () => {
      const point = { x: 3, y: 2 }
      const center = { x: 2, y: 2 }
      const result = rotatePoint(point, center, Math.PI / 2)
      expect(result.x).toBeCloseTo(2)
      expect(result.y).toBeCloseTo(3)
    })

    it('full rotation returns to original point', () => {
      const point = { x: 3, y: 7 }
      const center = { x: 1, y: 1 }
      const result = rotatePoint(point, center, TWO_PI)
      expect(result.x).toBeCloseTo(point.x)
      expect(result.y).toBeCloseTo(point.y)
    })

    it('preserves distance from center after rotation', () => {
      const point = { x: 4, y: 3 }
      const center = { x: 1, y: 1 }
      const angle = 1.23
      const result = rotatePoint(point, center, angle)
      expect(distance(result, center)).toBeCloseTo(distance(point, center))
    })
  })
})
