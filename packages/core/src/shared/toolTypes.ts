export type LinearToolType = "arrow" | "line";
export type ShapeToolType = "rectangle" | "ellipse" | "diamond";
export type DrawingToolType = ShapeToolType | LinearToolType;

export type ToolType =
  | "selection"
  | "hand"
  | "text"
  | "code"
  | "image"
  | "freedraw"
  | "eraser"
  | DrawingToolType;

export function isDrawingTool(tool: ToolType): tool is DrawingToolType {
  return (
    tool === "rectangle" ||
    tool === "ellipse" ||
    tool === "diamond" ||
    tool === "arrow" ||
    tool === "line"
  );
}

export function isLinearTool(tool: ToolType): tool is LinearToolType {
  return tool === "arrow" || tool === "line";
}

export function isShapeTool(tool: ToolType): tool is ShapeToolType {
  return tool === "rectangle" || tool === "ellipse" || tool === "diamond";
}

export function isTextTool(tool: ToolType): tool is "text" {
  return tool === "text";
}

export function isCodeTool(tool: ToolType): tool is "code" {
  return tool === "code";
}

export function isImageTool(tool: ToolType): tool is "image" {
  return tool === "image";
}

export function isFreeDrawTool(tool: ToolType): tool is "freedraw" {
  return tool === "freedraw";
}

export function isEraserTool(tool: ToolType): tool is "eraser" {
  return tool === "eraser";
}
