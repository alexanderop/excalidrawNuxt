import { randomVersionNonce } from '~/shared/random'
import type { ExcalidrawElement } from './types'

export function mutateElement<T extends ExcalidrawElement>(
  element: T,
  updates: Partial<Omit<ExcalidrawElement, 'id' | 'type'>>,
): T {
  Object.assign(element, updates, { versionNonce: randomVersionNonce() })
  return element
}
