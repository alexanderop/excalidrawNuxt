export type LinearToolType = 'arrow'
export type ShapeToolType = 'rectangle' | 'ellipse' | 'diamond'
export type DrawingToolType = ShapeToolType | LinearToolType

export type ToolType = 'selection' | 'hand' | DrawingToolType

export function isDrawingTool(tool: ToolType): tool is DrawingToolType {
  return tool === 'rectangle' || tool === 'ellipse' || tool === 'diamond' || tool === 'arrow'
}

export function isLinearTool(tool: ToolType): tool is LinearToolType {
  return tool === 'arrow'
}

export function isShapeTool(tool: ToolType): tool is ShapeToolType {
  return tool === 'rectangle' || tool === 'ellipse' || tool === 'diamond'
}
