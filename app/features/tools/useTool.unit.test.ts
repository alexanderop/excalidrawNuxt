import { withSetup } from '~/__test-utils__/withSetup'
import { useTool } from './useTool'

describe('useTool', () => {
  it('defaults activeTool to selection', () => {
    using tool = withSetup(() => useTool())
    expect(tool.activeTool.value).toBe('selection')
  })

  it('sets activeTool via setTool', () => {
    using tool = withSetup(() => useTool())
    tool.setTool('rectangle')
    expect(tool.activeTool.value).toBe('rectangle')
  })

  it('sets activeTool to each tool type', () => {
    using tool = withSetup(() => useTool())
    const tools = ['selection', 'hand', 'rectangle', 'ellipse', 'diamond'] as const

    for (const t of tools) {
      tool.setTool(t)
      expect(tool.activeTool.value).toBe(t)
    }
  })
})
