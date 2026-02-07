import { withSetup } from '~/__test-utils__/withSetup'
import { useToolStore } from './useTool'

describe('useToolStore', () => {
  afterEach(() => {
    const store = useToolStore()
    store.$reset()
  })

  it('defaults activeTool to selection', () => {
    using store = withSetup(() => useToolStore())
    expect(store.activeTool.value).toBe('selection')
  })

  it('sets activeTool via setTool', () => {
    using store = withSetup(() => useToolStore())
    store.setTool('rectangle')
    expect(store.activeTool.value).toBe('rectangle')
  })

  it('sets activeTool to each tool type', () => {
    using store = withSetup(() => useToolStore())
    const tools = ['selection', 'hand', 'rectangle', 'ellipse', 'diamond'] as const

    for (const t of tools) {
      store.setTool(t)
      expect(store.activeTool.value).toBe(t)
    }
  })

  it('fires onBeforeToolChange before setting the tool', () => {
    using store = withSetup(() => useToolStore())
    const captured: string[] = []

    store.onBeforeToolChange(() => {
      captured.push(store.activeTool.value)
    })

    store.setTool('rectangle')

    expect(captured).toEqual(['selection'])
    expect(store.activeTool.value).toBe('rectangle')
  })
})
