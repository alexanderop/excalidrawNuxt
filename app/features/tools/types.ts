export type DrawingToolType = 'rectangle' | 'ellipse' | 'diamond'

export type ToolType = 'selection' | 'hand' | DrawingToolType

export function isDrawingTool(tool: ToolType): tool is DrawingToolType {
  return tool === 'rectangle' || tool === 'ellipse' || tool === 'diamond'
}
