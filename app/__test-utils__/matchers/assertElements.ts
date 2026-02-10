import { expect } from 'vitest'
import type { ExcalidrawElement } from '~/features/elements/types'
import { API } from '../browser/api'

export function assertElements(
  actual: readonly ExcalidrawElement[],
  expected: { id: string; selected?: true; [key: string]: unknown }[],
): void {
  // Check order
  expect(actual.map(e => e.id)).toEqual(expected.map(e => e.id))

  // Check properties (only the ones specified in expected)
  for (const exp of expected) {
    const act = actual.find(e => e.id === exp.id)
    expect(act).toBeDefined()
    for (const [key, value] of Object.entries(exp)) {
      if (key === 'selected') continue
      expect((act as Record<string, unknown>)[key]).toEqual(value)
    }
  }

  // Check selection
  const expectedSelected = expected.filter(e => e.selected).map(e => e.id)
  const actualSelected = API.getSelectedElements().map(e => e.id)
  expect(actualSelected.toSorted()).toEqual(expectedSelected.toSorted())
}
