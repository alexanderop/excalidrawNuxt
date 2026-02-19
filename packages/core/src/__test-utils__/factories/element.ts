import { pointFrom } from "../../shared/math";
import type { LocalPoint, Radians } from "../../shared/math";
import type {
  ExcalidrawArrowElement,
  ExcalidrawDiamondElement,
  ExcalidrawElement,
  ExcalidrawEllipseElement,
  ExcalidrawEmbeddableElement,
  ExcalidrawImageElement,
  ExcalidrawRectangleElement,
  ExcalidrawTextElement,
} from "../../features/elements/types";
import { toFileId } from "../../features/image/types";

const BASE_PROPS = {
  id: "test-id",
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  angle: 0 as Radians,
  strokeColor: "#1e1e1e",
  backgroundColor: "transparent",
  fillStyle: "hachure" as const,
  strokeWidth: 2,
  strokeStyle: "solid" as const,
  roughness: 1,
  opacity: 100,
  seed: 12_345,
  versionNonce: 67_890,
  version: 0,
  isDeleted: false,
  boundElements: null,
  groupIds: [] as readonly string[],
  index: null,
  frameId: null,
  locked: false,
  updated: 0,
  link: null,
  roundness: null,
  customData: undefined,
};

export function createTestElement(
  overrides?: Partial<ExcalidrawRectangleElement> & { type?: "rectangle" },
): ExcalidrawRectangleElement;
export function createTestElement(
  overrides: Partial<ExcalidrawEllipseElement> & { type: "ellipse" },
): ExcalidrawEllipseElement;
export function createTestElement(
  overrides: Partial<ExcalidrawDiamondElement> & { type: "diamond" },
): ExcalidrawDiamondElement;
export function createTestElement(overrides: Partial<ExcalidrawElement> = {}): ExcalidrawElement {
  const type = overrides.type ?? "rectangle";
  if (type === "ellipse") return { ...BASE_PROPS, ...overrides, type } as ExcalidrawElement;
  if (type === "diamond") return { ...BASE_PROPS, ...overrides, type } as ExcalidrawElement;
  return { ...BASE_PROPS, ...overrides, type: "rectangle" } as ExcalidrawElement;
}

export function createTestArrowElement(
  overrides: Partial<Omit<ExcalidrawArrowElement, "type">> = {},
): ExcalidrawArrowElement {
  const defaults = {
    ...BASE_PROPS,
    type: "arrow" as const,
    points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 50)] as readonly LocalPoint[],
    lastCommittedPoint: null,
    startArrowhead: null,
    endArrowhead: "arrow" as const,
    startBinding: null,
    endBinding: null,
    elbowed: false,
  };
  return Object.assign(defaults, overrides) as ExcalidrawArrowElement;
}

export function createTestTextElement(
  overrides: Partial<Omit<ExcalidrawTextElement, "type">> = {},
): ExcalidrawTextElement {
  return {
    ...BASE_PROPS,
    type: "text" as const,
    fontSize: 20,
    fontFamily: 1,
    lineHeight: 1.25,
    text: "Test text",
    originalText: "Test text",
    containerId: null,
    textAlign: "left" as const,
    ...overrides,
  } as ExcalidrawTextElement;
}

export function createTestImageElement(
  overrides: Partial<Omit<ExcalidrawImageElement, "type">> = {},
): ExcalidrawImageElement {
  return {
    ...BASE_PROPS,
    type: "image" as const,
    fileId: toFileId("test-file-id"),
    scale: [1, 1] as readonly [number, number],
    status: "saved" as const,
    ...overrides,
  } as ExcalidrawImageElement;
}

export function createTestEmbeddableElement(
  overrides: Partial<Omit<ExcalidrawEmbeddableElement, "type">> = {},
): ExcalidrawEmbeddableElement {
  return {
    ...BASE_PROPS,
    type: "embeddable" as const,
    link: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    ...overrides,
  } as ExcalidrawEmbeddableElement;
}
