import { isDrawingTool } from './types'
import type { ToolType } from './types'

describe('isDrawingTool', () => {
  it('returns true for rectangle', () => {
    expect(isDrawingTool('rectangle')).toBe(true)
  })

  it('returns true for ellipse', () => {
    expect(isDrawingTool('ellipse')).toBe(true)
  })

  it('returns true for diamond', () => {
    expect(isDrawingTool('diamond')).toBe(true)
  })

  it('returns false for selection', () => {
    expect(isDrawingTool('selection')).toBe(false)
  })

  it('returns false for hand', () => {
    expect(isDrawingTool('hand')).toBe(false)
  })

  it('handles all ToolType values', () => {
    const drawingTools: ToolType[] = ['rectangle', 'ellipse', 'diamond']
    const nonDrawingTools: ToolType[] = ['selection', 'hand']

    for (const tool of drawingTools) {
      expect(isDrawingTool(tool)).toBe(true)
    }
    for (const tool of nonDrawingTools) {
      expect(isDrawingTool(tool)).toBe(false)
    }
  })
})
