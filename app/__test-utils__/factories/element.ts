import { createPoint } from '~/shared/math'
import type {
  ExcalidrawArrowElement,
  ExcalidrawDiamondElement,
  ExcalidrawElement,
  ExcalidrawEllipseElement,
  ExcalidrawRectangleElement,
} from '~/features/elements/types'

const BASE_PROPS = {
  id: 'test-id',
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  angle: 0,
  strokeColor: '#1e1e1e',
  backgroundColor: 'transparent',
  fillStyle: 'hachure',
  strokeWidth: 2,
  roughness: 1,
  opacity: 100,
  seed: 12_345,
  versionNonce: 67_890,
  isDeleted: false,
}

export function createTestElement(overrides?: Partial<ExcalidrawRectangleElement> & { type?: 'rectangle' }): ExcalidrawRectangleElement
export function createTestElement(overrides: Partial<ExcalidrawEllipseElement> & { type: 'ellipse' }): ExcalidrawEllipseElement
export function createTestElement(overrides: Partial<ExcalidrawDiamondElement> & { type: 'diamond' }): ExcalidrawDiamondElement
export function createTestElement(
  overrides: Partial<ExcalidrawElement> = {},
): ExcalidrawElement {
  const type = overrides.type ?? 'rectangle'
  if (type === 'ellipse') return { ...BASE_PROPS, ...overrides, type }
  if (type === 'diamond') return { ...BASE_PROPS, ...overrides, type }
  return { ...BASE_PROPS, ...overrides, type: 'rectangle' }
}

export function createTestArrowElement(
  overrides: Partial<Omit<ExcalidrawArrowElement, 'type'>> = {},
): ExcalidrawArrowElement {
  return {
    ...BASE_PROPS,
    type: 'arrow',
    points: [createPoint(0, 0), createPoint(100, 50)],
    startArrowhead: null,
    endArrowhead: 'arrow',
    ...overrides,
  }
}
