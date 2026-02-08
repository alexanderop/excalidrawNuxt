import type { ExcalidrawElement } from '~/features/elements/types'

export function snapshotElement(element: ExcalidrawElement): Record<string, unknown> {
  const { versionNonce: _versionNonce, seed: _seed, ...rest } = element
  return rest
}
