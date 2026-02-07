import { generateId, randomInteger, randomVersionNonce } from '~/shared/random'

describe('random utilities', () => {
  describe('generateId', () => {
    it('returns a string', () => {
      expect(typeof generateId()).toBe('string')
    })

    it('returns a non-empty string', () => {
      expect(generateId().length).toBeGreaterThan(0)
    })

    it('returns unique values on consecutive calls', () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateId()))
      expect(ids.size).toBe(100)
    })
  })

  describe('randomInteger', () => {
    it('returns an integer', () => {
      for (let i = 0; i < 100; i++) {
        expect(Number.isInteger(randomInteger())).toBe(true)
      }
    })

    it('returns a value >= 0', () => {
      for (let i = 0; i < 100; i++) {
        expect(randomInteger()).toBeGreaterThanOrEqual(0)
      }
    })

    it('returns a value < 2^31', () => {
      const upper = 2 ** 31
      for (let i = 0; i < 100; i++) {
        expect(randomInteger()).toBeLessThan(upper)
      }
    })
  })

  describe('randomVersionNonce', () => {
    it('returns an integer', () => {
      for (let i = 0; i < 100; i++) {
        expect(Number.isInteger(randomVersionNonce())).toBe(true)
      }
    })

    it('returns a value >= 0', () => {
      for (let i = 0; i < 100; i++) {
        expect(randomVersionNonce()).toBeGreaterThanOrEqual(0)
      }
    })

    it('returns a value < 2^31', () => {
      const upper = 2 ** 31
      for (let i = 0; i < 100; i++) {
        expect(randomVersionNonce()).toBeLessThan(upper)
      }
    })
  })
})
