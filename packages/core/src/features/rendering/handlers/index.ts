import type { ShapeHandlerRegistry } from "../../../shared/shapeHandlerRegistry";
import { rectangleHandler } from "./rectangleHandler";
import { ellipseHandler } from "./ellipseHandler";
import { diamondHandler } from "./diamondHandler";
import { arrowHandler } from "./arrowHandler";
import { lineHandler } from "./lineHandler";
import { textHandler } from "./textHandler";
import { freeDrawHandler } from "./freeDrawHandler";
import { imageHandler } from "./imageHandler";
import { embeddableHandler } from "./embeddableHandler";

export function registerDefaultHandlers(registry: ShapeHandlerRegistry): void {
  registry.register(rectangleHandler);
  registry.register(ellipseHandler);
  registry.register(diamondHandler);
  registry.register(arrowHandler);
  registry.register(lineHandler);
  registry.register(textHandler);
  registry.register(freeDrawHandler);
  registry.register(imageHandler);
  registry.register(embeddableHandler);
}
