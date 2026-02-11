import { getFontString, getLineHeightInPx } from './textMeasurement'

describe('getFontString', () => {
  it('returns correct string for fontFamily 1 (sans-serif)', () => {
    expect(getFontString(16, 1)).toBe('16px sans-serif')
  })

  it('returns correct string for fontFamily 2 (serif)', () => {
    expect(getFontString(20, 2)).toBe('20px serif')
  })

  it('returns correct string for fontFamily 3 (monospace)', () => {
    expect(getFontString(14, 3)).toBe('14px monospace')
  })

  it('defaults to sans-serif for unknown fontFamily', () => {
    expect(getFontString(18, 99)).toBe('18px sans-serif')
  })
})

describe('getLineHeightInPx', () => {
  it('calculates correctly (20 * 1.25 = 25)', () => {
    expect(getLineHeightInPx(20, 1.25)).toBe(25)
  })
})
