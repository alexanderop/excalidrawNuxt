import type { RoughCanvas } from "roughjs/bin/canvas";
import type { ExcalidrawElement, FileId, SupportedElementType } from "../features/elements/types";
import type { ImageCacheEntry } from "../features/image/types";
import type { Theme } from "../features/theme/types";
import type { GlobalPoint } from "./math";
import type { Bounds } from "../features/selection/bounds";

// ── ShapeHandler — required for all element types ─────────────────────

export interface ShapeHandler<T extends ExcalidrawElement = ExcalidrawElement> {
  readonly type: SupportedElementType;
  render(
    ctx: CanvasRenderingContext2D,
    rc: RoughCanvas,
    element: T,
    theme: Theme,
    imageCache?: ReadonlyMap<FileId, ImageCacheEntry>,
    zoom?: number,
  ): void;
  hitTest(point: GlobalPoint, element: T, threshold: number): boolean;
  getBounds(element: T): Bounds;
}

// ── BindableShapeHandler — for shapes that arrows can bind to ─────────

export interface BindableShapeHandler<
  T extends ExcalidrawElement = ExcalidrawElement,
> extends ShapeHandler<T> {
  distanceToEdge(element: T, point: GlobalPoint): number;
  isPointInside(element: T, point: GlobalPoint): boolean;
  projectOntoEdge(element: T, cx: number, cy: number, dirX: number, dirY: number): GlobalPoint;
  drawHighlight(ctx: CanvasRenderingContext2D, element: T, padding: number): void;
}

// ── Type guard ────────────────────────────────────────────────────────

export function isBindableHandler(h: ShapeHandler): h is BindableShapeHandler {
  return (
    "distanceToEdge" in h && "isPointInside" in h && "projectOntoEdge" in h && "drawHighlight" in h
  );
}

// ── Registry ──────────────────────────────────────────────────────────

export interface ShapeHandlerRegistry {
  register(handler: ShapeHandler): void;
  getHandler(element: ExcalidrawElement): ShapeHandler;
  getHandlerByType(type: SupportedElementType): ShapeHandler;
  hasHandler(type: SupportedElementType): boolean;
}

export function createShapeHandlerRegistry(): ShapeHandlerRegistry {
  const handlers = new Map<string, ShapeHandler>();

  function register(handler: ShapeHandler): void {
    handlers.set(handler.type, handler);
  }

  function getHandlerByType(type: SupportedElementType): ShapeHandler {
    const handler = handlers.get(type);
    if (!handler) {
      throw new Error(`No shape handler registered for type: ${type}`);
    }
    return handler;
  }

  function getHandler(element: ExcalidrawElement): ShapeHandler {
    const handler = handlers.get(element.type);
    if (!handler) {
      throw new Error(`No shape handler registered for element type: "${element.type}"`);
    }
    return handler;
  }

  function hasHandler(type: SupportedElementType): boolean {
    return handlers.has(type);
  }

  return { register, getHandler, getHandlerByType, hasHandler };
}
