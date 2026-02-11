import { shallowRef } from 'vue'
import type { ExcalidrawElement } from '~/features/elements/types'
import { withSetup } from '~/__test-utils__/withSetup'
import { createTestElement } from '~/__test-utils__/factories/element'
import { useGroups } from './useGroups'

vi.mock('~/shared/random', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/shared/random')>()
  return { ...actual, generateId: () => 'mock-group-id' }
})

function createGroupsSetup(initialElements: ExcalidrawElement[]) {
  const elements = shallowRef<readonly ExcalidrawElement[]>(initialElements)
  const selectedIds = shallowRef<ReadonlySet<string>>(new Set())
  const markStaticDirty = vi.fn()
  const markInteractiveDirty = vi.fn()

  return {
    elements,
    selectedIds,
    selectedElements: () => elements.value.filter(el => selectedIds.value.has(el.id)),
    replaceSelection: (ids: Set<string>) => { selectedIds.value = ids },
    replaceElements: (els: readonly ExcalidrawElement[]) => { elements.value = els },
    markStaticDirty,
    markInteractiveDirty,
  }
}

describe('useGroups', () => {
  describe('groupSelection', () => {
    it('adds groupId to all selected elements', () => {
      const el1 = createTestElement({ id: 'el-1' })
      const el2 = createTestElement({ id: 'el-2' })
      const setup = createGroupsSetup([el1, el2])
      setup.selectedIds.value = new Set(['el-1', 'el-2'])

      using groups = withSetup(() => useGroups(setup))
      groups.groupSelection()

      expect(el1.groupIds).toContain('mock-group-id')
      expect(el2.groupIds).toContain('mock-group-id')
    })

    it('does nothing with fewer than 2 elements', () => {
      const el1 = createTestElement({ id: 'el-1' })
      const setup = createGroupsSetup([el1])
      setup.selectedIds.value = new Set(['el-1'])

      using groups = withSetup(() => useGroups(setup))
      groups.groupSelection()

      expect(el1.groupIds).toEqual([])
    })

    it('does nothing if already in same group', () => {
      const el1 = createTestElement({ id: 'el-1', groupIds: ['existing-group'] })
      const el2 = createTestElement({ id: 'el-2', groupIds: ['existing-group'] })
      const setup = createGroupsSetup([el1, el2])
      setup.selectedIds.value = new Set(['el-1', 'el-2'])

      using groups = withSetup(() => useGroups(setup))
      groups.groupSelection()

      // groupIds should remain unchanged — no new group added
      expect(el1.groupIds).toEqual(['existing-group'])
      expect(el2.groupIds).toEqual(['existing-group'])
    })
  })

  describe('ungroupSelection', () => {
    it('removes group ids from elements', () => {
      const el1 = createTestElement({ id: 'el-1', groupIds: ['group-1'] })
      const el2 = createTestElement({ id: 'el-2', groupIds: ['group-1'] })
      const setup = createGroupsSetup([el1, el2])
      setup.selectedIds.value = new Set(['el-1', 'el-2'])

      using groups = withSetup(() => useGroups(setup))
      groups.selectedGroupIds.value = new Set(['group-1'])
      groups.ungroupSelection()

      expect(el1.groupIds).toEqual([])
      expect(el2.groupIds).toEqual([])
    })

    it('does nothing when no groups selected', () => {
      const el1 = createTestElement({ id: 'el-1', groupIds: ['group-1'] })
      const setup = createGroupsSetup([el1])

      using groups = withSetup(() => useGroups(setup))
      groups.ungroupSelection()

      expect(el1.groupIds).toEqual(['group-1'])
    })
  })

  describe('expandSelectionForGroups', () => {
    it('expands to include group members', () => {
      const el1 = createTestElement({ id: 'el-1', groupIds: ['group-1'] })
      const el2 = createTestElement({ id: 'el-2', groupIds: ['group-1'] })
      const el3 = createTestElement({ id: 'el-3' })
      const setup = createGroupsSetup([el1, el2, el3])
      setup.selectedIds.value = new Set(['el-1'])

      using groups = withSetup(() => useGroups(setup))
      groups.expandSelectionForGroups()

      expect(setup.selectedIds.value).toContain('el-1')
      expect(setup.selectedIds.value).toContain('el-2')
      expect(setup.selectedIds.value).not.toContain('el-3')
    })
  })

  describe('isSelectedViaGroup', () => {
    it('returns true for element in selected group', () => {
      const el1 = createTestElement({ id: 'el-1', groupIds: ['group-1'] })
      const setup = createGroupsSetup([el1])

      using groups = withSetup(() => useGroups(setup))
      groups.selectedGroupIds.value = new Set(['group-1'])

      expect(groups.isSelectedViaGroup(el1)).toBe(true)
    })
  })
})
