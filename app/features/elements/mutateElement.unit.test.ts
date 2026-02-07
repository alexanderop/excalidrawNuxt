import { mutateElement } from './mutateElement'
import { createTestElement } from '~/__test-utils__/factories/element'

describe('mutateElement', () => {
  it('updates properties on the element', () => {
    const el = createTestElement()
    mutateElement(el, { x: 50, y: 75 })
    expect(el.x).toBe(50)
    expect(el.y).toBe(75)
  })

  it('bumps the versionNonce', () => {
    const el = createTestElement({ versionNonce: 999 })
    mutateElement(el, { x: 10 })
    expect(el.versionNonce).not.toBe(999)
  })

  it('returns the same object reference', () => {
    const el = createTestElement()
    const returned = mutateElement(el, { width: 300 })
    expect(returned).toBe(el)
  })

  it('does not modify the id', () => {
    const el = createTestElement({ versionNonce: 1 })
    const originalId = el.id
    mutateElement(el, { x: 999 })
    expect(el.id).toBe(originalId)
  })

  it('does not modify the type', () => {
    const el = createTestElement()
    mutateElement(el, { width: 50 })
    expect(el.type).toBe('rectangle')
  })

  it('applies multiple updates at once', () => {
    const el = createTestElement()
    mutateElement(el, {
      x: 10,
      y: 20,
      width: 300,
      height: 400,
      strokeColor: '#00ff00',
    })
    expect(el.x).toBe(10)
    expect(el.y).toBe(20)
    expect(el.width).toBe(300)
    expect(el.height).toBe(400)
    expect(el.strokeColor).toBe('#00ff00')
  })
})
