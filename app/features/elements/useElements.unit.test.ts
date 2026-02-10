import { withSetup } from '~/__test-utils__/withSetup'
import { useElements } from './useElements'
import { createTestElement } from '~/__test-utils__/factories/element'

describe('useElements', () => {
  // eslint-disable-next-line vitest/no-hooks -- createGlobalState singleton needs reset between tests
  beforeEach(() => { useElements().replaceElements([]) })

  it('starts with an empty array', () => {
    using els = withSetup(() => useElements())
    expect(els.elements.value).toEqual([])
  })

  describe('addElement', () => {
    it('adds an element to the array', () => {
      using els = withSetup(() => useElements())
      const el = createTestElement()
      els.addElement(el)
      expect(els.elements.value).toHaveLength(1)
      expect(els.elements.value[0]).toBe(el)
    })

    it('creates a new array reference on each add', () => {
      using els = withSetup(() => useElements())
      const before = els.elements.value
      els.addElement(createTestElement())
      expect(els.elements.value).not.toBe(before)
    })

    it('preserves existing elements when adding', () => {
      using els = withSetup(() => useElements())
      const first = createTestElement({ versionNonce: 1 })
      const second = createTestElement({ versionNonce: 2 })
      els.addElement(first)
      els.addElement(second)
      expect(els.elements.value).toHaveLength(2)
      expect(els.elements.value[0]).toBe(first)
      expect(els.elements.value[1]).toBe(second)
    })
  })

  describe('replaceElements', () => {
    it('replaces all elements', () => {
      using els = withSetup(() => useElements())
      els.addElement(createTestElement({ versionNonce: 1 }))
      els.addElement(createTestElement({ versionNonce: 2 }))

      const replacement = [createTestElement({ versionNonce: 99 })]
      els.replaceElements(replacement)

      expect(els.elements.value).toHaveLength(1)
      expect(els.elements.value.at(0)?.versionNonce).toBe(99)
    })

    it('can replace with an empty array', () => {
      using els = withSetup(() => useElements())
      els.addElement(createTestElement())
      els.replaceElements([])
      expect(els.elements.value).toEqual([])
    })

    it('creates a new array reference', () => {
      using els = withSetup(() => useElements())
      const before = els.elements.value
      els.replaceElements([createTestElement()])
      expect(els.elements.value).not.toBe(before)
    })
  })
})
