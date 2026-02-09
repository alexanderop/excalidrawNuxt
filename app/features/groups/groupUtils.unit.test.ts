import { describe, it, expect } from 'vitest'
import { createTestElement } from '~/__test-utils__/factories/element'
import {
  getElementsInGroup,
  isElementInGroup,
  getOutermostGroupId,
  addToGroup,
  removeFromGroups,
  expandSelectionToGroups,
  isSelectedViaGroup,
  elementsAreInSameGroup,
  reorderElementsForGroup,
  cleanupAfterDelete,
} from './groupUtils'

describe('getElementsInGroup', () => {
  it('returns elements matching the group id', () => {
    const el1 = createTestElement({ id: 'a', groupIds: ['g1'] })
    const el2 = createTestElement({ id: 'b', groupIds: ['g1'] })
    const el3 = createTestElement({ id: 'c', groupIds: ['g2'] })

    const result = getElementsInGroup([el1, el2, el3], 'g1')
    expect(result.map(e => e.id)).toEqual(['a', 'b'])
  })

  it('returns empty array when no elements match', () => {
    const el1 = createTestElement({ id: 'a', groupIds: [] })
    expect(getElementsInGroup([el1], 'g1')).toEqual([])
  })
})

describe('isElementInGroup', () => {
  it('returns true when element belongs to the group', () => {
    const el = createTestElement({ groupIds: ['g1'] })
    expect(isElementInGroup(el, 'g1')).toBe(true)
  })

  it('returns false when element does not belong to the group', () => {
    const el = createTestElement({ groupIds: ['g2'] })
    expect(isElementInGroup(el, 'g1')).toBe(false)
  })

  it('returns false when element has no groups', () => {
    const el = createTestElement({ groupIds: [] })
    expect(isElementInGroup(el, 'g1')).toBe(false)
  })
})

describe('getOutermostGroupId', () => {
  it('returns null for element with no groups', () => {
    const el = createTestElement({ groupIds: [] })
    expect(getOutermostGroupId(el)).toBeNull()
  })

  it('returns the last group id', () => {
    const el = createTestElement({ groupIds: ['g1', 'g2'] })
    expect(getOutermostGroupId(el)).toBe('g2')
  })

  it('returns the only group id for single group', () => {
    const el = createTestElement({ groupIds: ['g1'] })
    expect(getOutermostGroupId(el)).toBe('g1')
  })
})

describe('addToGroup', () => {
  it('appends the new group id', () => {
    expect(addToGroup(['g1'], 'g2')).toEqual(['g1', 'g2'])
  })

  it('works with empty array', () => {
    expect(addToGroup([], 'g1')).toEqual(['g1'])
  })
})

describe('removeFromGroups', () => {
  it('removes specified group ids', () => {
    const result = removeFromGroups(['g1', 'g2', 'g3'], new Set(['g1', 'g3']))
    expect(result).toEqual(['g2'])
  })

  it('returns same values when nothing to remove', () => {
    const result = removeFromGroups(['g1'], new Set(['g2']))
    expect(result).toEqual(['g1'])
  })

  it('returns empty array when all removed', () => {
    const result = removeFromGroups(['g1'], new Set(['g1']))
    expect(result).toEqual([])
  })
})

describe('expandSelectionToGroups', () => {
  it('expands selection to include all group members', () => {
    const el1 = createTestElement({ id: 'a', groupIds: ['g1'] })
    const el2 = createTestElement({ id: 'b', groupIds: ['g1'] })
    const el3 = createTestElement({ id: 'c', groupIds: [] })

    const result = expandSelectionToGroups([el1, el2, el3], new Set(['a']))
    expect(result.elementIds).toEqual(new Set(['a', 'b']))
    expect(result.groupIds).toEqual(new Set(['g1']))
  })

  it('does not expand for ungrouped elements', () => {
    const el1 = createTestElement({ id: 'a', groupIds: [] })
    const el2 = createTestElement({ id: 'b', groupIds: [] })

    const result = expandSelectionToGroups([el1, el2], new Set(['a']))
    expect(result.elementIds).toEqual(new Set(['a']))
    expect(result.groupIds).toEqual(new Set())
  })

  it('handles multiple groups', () => {
    const el1 = createTestElement({ id: 'a', groupIds: ['g1'] })
    const el2 = createTestElement({ id: 'b', groupIds: ['g1'] })
    const el3 = createTestElement({ id: 'c', groupIds: ['g2'] })
    const el4 = createTestElement({ id: 'd', groupIds: ['g2'] })

    const result = expandSelectionToGroups(
      [el1, el2, el3, el4],
      new Set(['a', 'c']),
    )
    expect(result.elementIds).toEqual(new Set(['a', 'b', 'c', 'd']))
    expect(result.groupIds).toEqual(new Set(['g1', 'g2']))
  })

  it('skips deleted elements during expansion', () => {
    const el1 = createTestElement({ id: 'a', groupIds: ['g1'] })
    const el2 = createTestElement({ id: 'b', groupIds: ['g1'], isDeleted: true })

    const result = expandSelectionToGroups([el1, el2], new Set(['a']))
    expect(result.elementIds).toEqual(new Set(['a']))
  })
})

describe('isSelectedViaGroup', () => {
  it('returns true when element group is selected', () => {
    const el = createTestElement({ groupIds: ['g1'] })
    expect(isSelectedViaGroup(el, new Set(['g1']))).toBe(true)
  })

  it('returns false when element group is not selected', () => {
    const el = createTestElement({ groupIds: ['g1'] })
    expect(isSelectedViaGroup(el, new Set(['g2']))).toBe(false)
  })

  it('returns false for ungrouped element', () => {
    const el = createTestElement({ groupIds: [] })
    expect(isSelectedViaGroup(el, new Set(['g1']))).toBe(false)
  })
})

describe('elementsAreInSameGroup', () => {
  it('returns true when all elements share a group', () => {
    const el1 = createTestElement({ id: 'a', groupIds: ['g1'] })
    const el2 = createTestElement({ id: 'b', groupIds: ['g1'] })
    expect(elementsAreInSameGroup([el1, el2])).toBe(true)
  })

  it('returns false when elements have different groups', () => {
    const el1 = createTestElement({ id: 'a', groupIds: ['g1'] })
    const el2 = createTestElement({ id: 'b', groupIds: ['g2'] })
    expect(elementsAreInSameGroup([el1, el2])).toBe(false)
  })

  it('returns true for fewer than 2 elements (vacuous truth)', () => {
    const el1 = createTestElement({ id: 'a', groupIds: ['g1'] })
    expect(elementsAreInSameGroup([el1])).toBe(true)
    expect(elementsAreInSameGroup([])).toBe(true)
  })

  it('returns false when first element has no groups', () => {
    const el1 = createTestElement({ id: 'a', groupIds: [] })
    const el2 = createTestElement({ id: 'b', groupIds: ['g1'] })
    expect(elementsAreInSameGroup([el1, el2])).toBe(false)
  })
})

describe('reorderElementsForGroup', () => {
  it('moves group elements to be contiguous at topmost position', () => {
    const el1 = createTestElement({ id: 'a' })
    const el2 = createTestElement({ id: 'b' })
    const el3 = createTestElement({ id: 'c' })
    const el4 = createTestElement({ id: 'd' })

    // Group elements are a and c (indices 0 and 2), topmost is index 2
    const result = reorderElementsForGroup(
      [el1, el2, el3, el4],
      new Set(['a', 'c']),
    )
    expect(result.map(e => e.id)).toEqual(['b', 'a', 'c', 'd'])
  })

  it('preserves order when group is already contiguous', () => {
    const el1 = createTestElement({ id: 'a' })
    const el2 = createTestElement({ id: 'b' })
    const el3 = createTestElement({ id: 'c' })

    const result = reorderElementsForGroup(
      [el1, el2, el3],
      new Set(['a', 'b']),
    )
    expect(result.map(e => e.id)).toEqual(['a', 'b', 'c'])
  })

  it('returns same array when no group elements found', () => {
    const el1 = createTestElement({ id: 'a' })
    const el2 = createTestElement({ id: 'b' })

    const elements = [el1, el2] as const
    const result = reorderElementsForGroup(elements, new Set(['x']))
    expect(result).toBe(elements)
  })

  it('handles group at the end', () => {
    const el1 = createTestElement({ id: 'a' })
    const el2 = createTestElement({ id: 'b' })
    const el3 = createTestElement({ id: 'c' })

    const result = reorderElementsForGroup(
      [el1, el2, el3],
      new Set(['a', 'c']),
    )
    expect(result.map(e => e.id)).toEqual(['b', 'a', 'c'])
  })
})

describe('cleanupAfterDelete', () => {
  it('removes group from remaining element when fewer than 2 remain', () => {
    const el1 = createTestElement({ id: 'a', groupIds: ['g1'] })
    const el2 = createTestElement({ id: 'b', groupIds: ['g1'] })

    cleanupAfterDelete([el1, el2], new Set(['a']))
    expect(el2.groupIds).toEqual([])
  })

  it('does not remove group when 2 or more remain', () => {
    const el1 = createTestElement({ id: 'a', groupIds: ['g1'] })
    const el2 = createTestElement({ id: 'b', groupIds: ['g1'] })
    const el3 = createTestElement({ id: 'c', groupIds: ['g1'] })

    cleanupAfterDelete([el1, el2, el3], new Set(['a']))
    expect(el2.groupIds).toEqual(['g1'])
    expect(el3.groupIds).toEqual(['g1'])
  })

  it('skips already deleted elements', () => {
    const el1 = createTestElement({ id: 'a', groupIds: ['g1'] })
    const el2 = createTestElement({ id: 'b', groupIds: ['g1'], isDeleted: true })
    const el3 = createTestElement({ id: 'c', groupIds: ['g1'] })

    cleanupAfterDelete([el1, el2, el3], new Set(['a']))
    // el3 is the only non-deleted, non-removed member, so group should be removed
    expect(el3.groupIds).toEqual([])
  })

  it('does nothing when no groups need cleanup', () => {
    const el1 = createTestElement({ id: 'a', groupIds: [] })
    const el2 = createTestElement({ id: 'b', groupIds: [] })

    cleanupAfterDelete([el1, el2], new Set(['a']))
    expect(el2.groupIds).toEqual([])
  })
})
