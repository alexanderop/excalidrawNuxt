import type { ExcalidrawElement } from '~/features/elements/types'

export function createTestElement(
  overrides: Partial<ExcalidrawElement> = {},
): ExcalidrawElement {
  return {
    id: 'test-id',
    type: 'rectangle',
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
    ...overrides,
  }
}
