import { randomVersionNonce } from '../random'
import type { ExcalidrawElement, ExcalidrawArrowElement, ExcalidrawElementBase, ExcalidrawTextElement } from './types'

type MutableFields = Partial<Omit<ExcalidrawElementBase, 'id' | 'type'>>
  & Partial<Pick<ExcalidrawArrowElement, 'points' | 'startArrowhead' | 'endArrowhead' | 'startBinding' | 'endBinding'>>
  & Partial<Pick<ExcalidrawTextElement, 'text' | 'originalText' | 'fontSize' | 'fontFamily' | 'textAlign' | 'lineHeight' | 'autoResize'>>

export function mutateElement<T extends ExcalidrawElement>(
  element: T,
  updates: MutableFields,
): T {
  Object.assign(element, updates, { versionNonce: randomVersionNonce() })
  return element
}

/**
 * Update element position without bumping versionNonce,
 * so the shape cache isn't invalidated during drag.
 */
export function moveElement<T extends ExcalidrawElement>(
  element: T,
  x: number,
  y: number,
): T {
  element.x = x
  element.y = y
  return element
}
