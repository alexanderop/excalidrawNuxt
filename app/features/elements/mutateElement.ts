import { randomVersionNonce } from '~/shared/random'
import type { ExcalidrawElement, ExcalidrawArrowElement, ExcalidrawElementBase } from './types'

type MutableFields = Partial<Omit<ExcalidrawElementBase, 'id' | 'type'>>
  & Partial<Pick<ExcalidrawArrowElement, 'points' | 'startArrowhead' | 'endArrowhead'>>

export function mutateElement<T extends ExcalidrawElement>(
  element: T,
  updates: MutableFields,
): T {
  Object.assign(element, updates, { versionNonce: randomVersionNonce() })
  return element
}
