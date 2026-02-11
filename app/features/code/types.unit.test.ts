import { isCodeElement, getCodeData } from './types'
import { createTestElement } from '~/__test-utils__/factories/element'

describe('isCodeElement', () => {
  it('returns true for rectangle with customData.code', () => {
    const el = createTestElement({
      customData: { code: 'console.log("hi")', language: 'typescript' },
    })
    expect(isCodeElement(el)).toBe(true)
  })

  it('returns false for rectangle without customData', () => {
    const el = createTestElement()
    expect(isCodeElement(el)).toBe(false)
  })

  it('returns false for non-rectangle even with customData.code', () => {
    const el = createTestElement({
      type: 'ellipse',
      customData: { code: 'console.log("hi")', language: 'typescript' },
    } as Parameters<typeof createTestElement>[0] & { type: 'ellipse' })
    expect(isCodeElement(el)).toBe(false)
  })
})

describe('getCodeData', () => {
  it('returns the customData object', () => {
    const codeData = { code: 'const x = 1', language: 'typescript' as const }
    const el = createTestElement({ customData: codeData })
    expect(getCodeData(el)).toBe(codeData)
  })
})
