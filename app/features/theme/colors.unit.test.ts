import { applyDarkModeFilter } from './colors'

describe('applyDarkModeFilter', () => {
  it('transforms white to near-black', () => {
    const result = applyDarkModeFilter('#ffffff')
    // Expected ~#121212 based on Excalidraw spec
    expect(result).toMatch(/^#1[0-3][\da-f]{4}$/i)
  })

  it('transforms near-black to near-white', () => {
    const result = applyDarkModeFilter('#1e1e1e')
    // Expected ~#e3e3e3 based on Excalidraw spec
    expect(result).toMatch(/^#[d-f][\da-f]{5}$/i)
  })

  it('transforms light gray to dark gray', () => {
    const result = applyDarkModeFilter('#dddddd')
    // Expected dark gray
    expect(result).toMatch(/^#[0-3][\da-f]{5}$/i)
  })

  it('preserves alpha channel', () => {
    const result = applyDarkModeFilter('rgba(255, 255, 255, 0.5)')
    // Should end with alpha hex (80 = 0.5 * 255 rounded)
    expect(result).toHaveLength(9) // #rrggbbaa
  })

  it('returns consistent results (caching)', () => {
    const first = applyDarkModeFilter('#ff0000')
    const second = applyDarkModeFilter('#ff0000')
    expect(first).toBe(second)
  })

  it('handles transparent color', () => {
    const result = applyDarkModeFilter('transparent')
    // tinycolor parses transparent as rgba(0,0,0,0)
    expect(result).toBeDefined()
  })
})
