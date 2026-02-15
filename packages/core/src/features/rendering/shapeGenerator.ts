import { RoughGenerator } from "roughjs/bin/generator";
import type { Drawable, Options } from "roughjs/bin/core";
import type { ExcalidrawElement } from "../elements/types";
import { isElbowArrow } from "../elements/types";
import type { LocalPoint } from "../../shared/math";
import type { Theme } from "../theme/types";
import { resolveColor } from "../theme/colors";
import { isCodeElement } from "../code";
import { generateElbowArrowShape } from "../elbow/shape";
import { ELBOW_CORNER_RADIUS } from "../elbow/constants";

const generator = new RoughGenerator();

interface CacheEntry {
  nonce: number;
  theme: Theme;
  zoomBucket: number;
  drawable: Drawable;
}

export function getZoomBucket(zoom: number): number {
  if (zoom <= 0.5) return 0;
  if (zoom <= 1) return 1;
  if (zoom <= 2) return 2;
  return 3;
}

const shapeCache = new Map<string, CacheEntry>();

export function clearShapeCache(): void {
  shapeCache.clear();
}

export function adjustRoughness(roughness: number, elementSize: number): number {
  if (elementSize < 30) return roughness * 0.5;
  if (elementSize < 60) return roughness * 0.75;
  return roughness;
}

function elementToRoughOptions(element: ExcalidrawElement, theme: Theme): Options {
  const elementSize = Math.min(element.width, element.height);
  const roughness = adjustRoughness(element.roughness, elementSize);

  const options: Options = {
    seed: element.seed,
    roughness,
    stroke: resolveColor(element.strokeColor, theme),
    strokeWidth: element.strokeWidth,
    fillStyle: element.fillStyle,
  };

  if (roughness < 2) {
    options.preserveVertices = true;
  }

  if (element.backgroundColor !== "transparent") {
    options.fill = resolveColor(element.backgroundColor, theme);
  }

  if (element.strokeStyle === "dashed" || element.strokeStyle === "dotted") {
    const dash =
      element.strokeStyle === "dashed"
        ? [8, 8 + element.strokeWidth]
        : [1.5, 6 + element.strokeWidth];
    options.strokeLineDash = dash;
    options.disableMultiStroke = true;
    options.strokeWidth = element.strokeWidth + 0.5;
  }

  return options;
}

const NON_ROUGH_TYPES = new Set(["text", "image"]);

function assertNotNonRoughType(element: ExcalidrawElement): void {
  if (NON_ROUGH_TYPES.has(element.type)) {
    throw new Error(`${element.type} elements should not use RoughJS shape generation`);
  }
  if (isCodeElement(element)) {
    throw new Error("Code elements should not use RoughJS shape generation");
  }
}

function generateLinearDrawable(element: ExcalidrawElement, options: Options): Drawable {
  const { points, roundness } = element as ExcalidrawElement & {
    points: readonly [number, number][];
    roundness: number | null;
  };

  if (element.type === "arrow" && isElbowArrow(element)) {
    const svgPath = generateElbowArrowShape(points as readonly LocalPoint[], ELBOW_CORNER_RADIUS);
    return generator.path(svgPath, options);
  }

  const pts = points.map((p) => [p[0], p[1]] satisfies [number, number]);
  if (roundness !== null) {
    return generator.curve(pts, options);
  }
  return generator.linearPath(pts, options);
}

function generateSimpleShapeDrawable(element: ExcalidrawElement, options: Options): Drawable {
  const { width, height } = element;

  if (element.type === "rectangle") {
    return generator.rectangle(0, 0, width, height, options);
  }

  if (element.type === "ellipse") {
    return generator.ellipse(width / 2, height / 2, width, height, options);
  }

  if (element.type === "diamond") {
    return generator.polygon(
      [
        [width / 2, 0],
        [width, height / 2],
        [width / 2, height],
        [0, height / 2],
      ],
      options,
    );
  }

  throw new Error(`Unhandled element type: ${(element as { type: string }).type}`);
}

function generateDrawable(element: ExcalidrawElement, theme: Theme): Drawable {
  assertNotNonRoughType(element);

  const options = elementToRoughOptions(element, theme);

  if (element.type === "arrow" || element.type === "line") {
    return generateLinearDrawable(element, options);
  }

  return generateSimpleShapeDrawable(element, options);
}

export function pruneShapeCache(elements: readonly ExcalidrawElement[]): void {
  const activeIds = new Set(elements.filter((el) => !el.isDeleted).map((el) => el.id));
  for (const key of shapeCache.keys()) {
    if (!activeIds.has(key)) {
      shapeCache.delete(key);
    }
  }
}

export function generateShape(element: ExcalidrawElement, theme: Theme, zoom = 1): Drawable {
  const bucket = getZoomBucket(zoom);
  const cached = shapeCache.get(element.id);

  const isCacheHit =
    cached &&
    cached.nonce === element.versionNonce &&
    cached.theme === theme &&
    cached.zoomBucket === bucket;

  if (isCacheHit) {
    return cached.drawable;
  }

  const drawable = generateDrawable(element, theme);
  shapeCache.set(element.id, { nonce: element.versionNonce, theme, zoomBucket: bucket, drawable });
  return drawable;
}
