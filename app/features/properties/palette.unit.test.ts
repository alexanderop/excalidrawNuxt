import { getAllPaletteColors, getTopPickColors, isStandardColor } from './palette'

describe('getAllPaletteColors', () => {
  it('returns 50 colors', () => {
    expect(getAllPaletteColors()).toHaveLength(50)
  })

  it('first color is lightest red (#ffc9c9)', () => {
    const colors = getAllPaletteColors()
    expect(colors[0]).toBe('#ffc9c9')
  })
})

describe('getTopPickColors', () => {
  it('returns 13 colors', () => {
    expect(getTopPickColors()).toHaveLength(13)
  })

  it('starts with transparent, black, white', () => {
    const picks = getTopPickColors()
    expect(picks[0]).toBe('transparent')
    expect(picks[1]).toBe('#1e1e1e')
    expect(picks[2]).toBe('#ffffff')
  })
})

describe('isStandardColor', () => {
  it('returns true for black (#1e1e1e)', () => {
    expect(isStandardColor('#1e1e1e')).toBe(true)
  })

  it('returns true for a palette hue color', () => {
    expect(isStandardColor('#ff8787')).toBe(true)
  })

  it('returns false for an arbitrary color (#123456)', () => {
    expect(isStandardColor('#123456')).toBe(false)
  })
})
