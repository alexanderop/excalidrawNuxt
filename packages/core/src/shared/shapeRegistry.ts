import { createShapeHandlerRegistry } from "./shapeHandlerRegistry";
import type { ShapeHandlerRegistry } from "./shapeHandlerRegistry";
import { registerDefaultHandlers } from "../features/rendering/handlers";

let _registry: ShapeHandlerRegistry | null = null;

function getRegistry(): ShapeHandlerRegistry {
  if (!_registry) {
    const registry = createShapeHandlerRegistry();
    registerDefaultHandlers(registry);
    _registry = registry;
  }
  return _registry;
}

/**
 * Lazily initialized shape handler registry.
 *
 * Initialization is deferred to the first access to break a circular
 * dependency: shapeRegistry -> handlers/index -> rectangleHandler ->
 * renderElement -> shapeRegistry.
 */
export const shapeRegistry: ShapeHandlerRegistry = {
  register(handler) {
    getRegistry().register(handler);
  },
  getHandler(element) {
    return getRegistry().getHandler(element);
  },
  getHandlerByType(type) {
    return getRegistry().getHandlerByType(type);
  },
  hasHandler(type) {
    return getRegistry().hasHandler(type);
  },
};
