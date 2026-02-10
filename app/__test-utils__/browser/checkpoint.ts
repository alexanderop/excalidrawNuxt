import { expect } from 'vitest'
import { API } from './api'

export function checkpoint(name: string): void {
  expect(API.elements.length).toMatchSnapshot(`[${name}] element count`)
  for (const [i, el] of API.elements.entries()) {
    expect(el).toMatchSnapshot(`[${name}] element ${i}`)
  }
  expect(API.activeTool).toMatchSnapshot(`[${name}] active tool`)
  expect([...API.h.selectedIds.value]).toMatchSnapshot(`[${name}] selected ids`)
}
