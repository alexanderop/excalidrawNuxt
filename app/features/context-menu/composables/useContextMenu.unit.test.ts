import { withSetup } from '~/__test-utils__/withSetup'
import type { ContextMenuContext } from '../types'

vi.mock('~/features/properties/composables/useStyleClipboard', () => ({
  useStyleClipboard: () => ({
    copyStyles: vi.fn(),
    pasteStyles: vi.fn(),
    hasStoredStyles: { value: false },
  }),
}))

const { useContextMenu } = await import('./useContextMenu')

function createMockContext(overrides: Partial<ContextMenuContext> = {}): ContextMenuContext {
  return {
    selectedIds: new Set(),
    selectedElements: [],
    hasGroups: false,
    isMultiSelect: false,
    markDirty: vi.fn(),
    ...overrides,
  }
}

describe('useContextMenu', () => {
  it('defaults to canvas menu type', () => {
    using result = withSetup(() => useContextMenu({ context: () => createMockContext() }))
    expect(result.menuType.value).toBe('canvas')
  })

  it('returns canvas menu items initially', () => {
    using result = withSetup(() => useContextMenu({ context: () => createMockContext() }))
    expect(result.items.value.length).toBeGreaterThan(0)

    const labels = result.items.value.filter(i => i.label).map(i => i.label)
    expect(labels).toContain('Paste')
    expect(labels).toContain('Select all')
  })

  it('returns element menu items when menuType is set to element', () => {
    using result = withSetup(() => useContextMenu({ context: () => createMockContext() }))
    result.menuType.value = 'element'

    const labels = result.items.value.filter(i => i.label).map(i => i.label)
    expect(labels).toContain('Cut')
    expect(labels).toContain('Copy')
    expect(labels).toContain('Delete')
  })

  it('items include separator entries', () => {
    using result = withSetup(() => useContextMenu({ context: () => createMockContext() }))
    const separators = result.items.value.filter(i => i.type === 'separator')
    expect(separators.length).toBeGreaterThan(0)
  })

  it('items have labels and kbds', () => {
    using result = withSetup(() => useContextMenu({ context: () => createMockContext() }))
    result.menuType.value = 'element'

    const actionItems = result.items.value.filter(i => i.label)
    expect(actionItems.length).toBeGreaterThan(0)

    const cutItem = actionItems.find(i => i.label === 'Cut')
    expect(cutItem).toBeDefined()
    expect(cutItem!.kbds).toBeDefined()
    expect(cutItem!.kbds!.length).toBeGreaterThan(0)
  })

  it('filtered items exclude actions whose predicate returns false', () => {
    const ctx = createMockContext({ hasGroups: false })
    using result = withSetup(() => useContextMenu({ context: () => ctx }))
    result.menuType.value = 'element'

    const labels = result.items.value.filter(i => i.label).map(i => i.label)
    expect(labels).not.toContain('Ungroup')
  })

  it('onSelect calls the original action', () => {
    using result = withSetup(() => useContextMenu({ context: () => createMockContext() }))

    const pasteItem = result.items.value.find(i => i.label === 'Paste')
    expect(pasteItem).toBeDefined()
    expect(pasteItem!.onSelect).toBeDefined()

    // Should not throw when called
    expect(() => pasteItem!.onSelect!(new Event('select'))).not.toThrow()
  })
})
