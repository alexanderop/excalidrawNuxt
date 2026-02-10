import { describe, it, expect } from 'vitest'
import { withSetup } from '~/__test-utils__/withSetup'
import { createTestElement } from '~/__test-utils__/factories/element'
import { useElements } from '../../useElements'
import { useLayerOrder } from '../useLayerOrder'

function setup(count: number, overrides?: Array<{ id: string; groupIds?: readonly string[] }>) {
  return withSetup(() => {
    const els = useElements()
    const items = overrides
      ? overrides.map(o => createTestElement({ id: o.id, groupIds: o.groupIds ?? [] }))
      : Array.from({ length: count }, (_, i) => createTestElement({ id: `el-${i}` }))

    els.replaceElements(items)
    const layerOrder = useLayerOrder({
      elements: els.elements,
      replaceElements: els.replaceElements,
    })
    return { els, layerOrder }
  })
}

function ids(ctx: { els: ReturnType<typeof useElements> }): string[] {
  return ctx.els.elements.value.map(el => el.id)
}

describe('useLayerOrder', () => {
  describe('bringToFront', () => {
    it('moves selected elements to the end of the array', () => {
      using ctx = setup(4)
      ctx.layerOrder.bringToFront(new Set(['el-0', 'el-1']))
      expect(ids(ctx)).toEqual(['el-2', 'el-3', 'el-0', 'el-1'])
    })

    it('is a no-op when already at front', () => {
      using ctx = setup(3)
      ctx.layerOrder.bringToFront(new Set(['el-2']))
      expect(ids(ctx)).toEqual(['el-0', 'el-1', 'el-2'])
    })

    it('preserves relative order of selected elements', () => {
      using ctx = setup(5)
      ctx.layerOrder.bringToFront(new Set(['el-1', 'el-3']))
      expect(ids(ctx)).toEqual(['el-0', 'el-2', 'el-4', 'el-1', 'el-3'])
    })

    it('handles empty selection', () => {
      using ctx = setup(3)
      ctx.layerOrder.bringToFront(new Set())
      expect(ids(ctx)).toEqual(['el-0', 'el-1', 'el-2'])
    })
  })

  describe('sendToBack', () => {
    it('moves selected elements to the start of the array', () => {
      using ctx = setup(4)
      ctx.layerOrder.sendToBack(new Set(['el-2', 'el-3']))
      expect(ids(ctx)).toEqual(['el-2', 'el-3', 'el-0', 'el-1'])
    })

    it('is a no-op when already at back', () => {
      using ctx = setup(3)
      ctx.layerOrder.sendToBack(new Set(['el-0']))
      expect(ids(ctx)).toEqual(['el-0', 'el-1', 'el-2'])
    })

    it('preserves relative order of selected elements', () => {
      using ctx = setup(5)
      ctx.layerOrder.sendToBack(new Set(['el-1', 'el-3']))
      expect(ids(ctx)).toEqual(['el-1', 'el-3', 'el-0', 'el-2', 'el-4'])
    })
  })

  describe('bringForward', () => {
    it('moves selected elements up one position', () => {
      using ctx = setup(4)
      ctx.layerOrder.bringForward(new Set(['el-1']))
      expect(ids(ctx)).toEqual(['el-0', 'el-2', 'el-1', 'el-3'])
    })

    it('is a no-op when already at top', () => {
      using ctx = setup(3)
      ctx.layerOrder.bringForward(new Set(['el-2']))
      expect(ids(ctx)).toEqual(['el-0', 'el-1', 'el-2'])
    })

    it('moves contiguous block up one position', () => {
      using ctx = setup(5)
      ctx.layerOrder.bringForward(new Set(['el-1', 'el-2']))
      expect(ids(ctx)).toEqual(['el-0', 'el-3', 'el-1', 'el-2', 'el-4'])
    })

    it('moves non-contiguous selected elements up one position', () => {
      using ctx = setup(5)
      // el-0, el-1, el-2, el-3, el-4
      // select el-1 and el-3 — top is el-3, first unselected above is el-4
      // el-4 moves below el-1 → el-0, el-4, el-1, el-2, el-3
      ctx.layerOrder.bringForward(new Set(['el-1', 'el-3']))
      expect(ids(ctx)).toEqual(['el-0', 'el-4', 'el-1', 'el-2', 'el-3'])
    })
  })

  describe('sendBackward', () => {
    it('moves selected elements down one position', () => {
      using ctx = setup(4)
      ctx.layerOrder.sendBackward(new Set(['el-2']))
      expect(ids(ctx)).toEqual(['el-0', 'el-2', 'el-1', 'el-3'])
    })

    it('is a no-op when already at bottom', () => {
      using ctx = setup(3)
      ctx.layerOrder.sendBackward(new Set(['el-0']))
      expect(ids(ctx)).toEqual(['el-0', 'el-1', 'el-2'])
    })

    it('moves contiguous block down one position', () => {
      using ctx = setup(5)
      ctx.layerOrder.sendBackward(new Set(['el-2', 'el-3']))
      expect(ids(ctx)).toEqual(['el-0', 'el-2', 'el-3', 'el-1', 'el-4'])
    })

    it('moves non-contiguous selected elements down one position', () => {
      using ctx = setup(5)
      // el-0, el-1, el-2, el-3, el-4
      // select el-1 and el-3 — lowest is el-1, first unselected below is el-0
      // el-0 moves above el-3 → el-1, el-2, el-3, el-0, el-4
      ctx.layerOrder.sendBackward(new Set(['el-1', 'el-3']))
      expect(ids(ctx)).toEqual(['el-1', 'el-2', 'el-3', 'el-0', 'el-4'])
    })
  })

  describe('group awareness', () => {
    it('bringToFront moves entire group when one member is selected', () => {
      using ctx = setup(0, [
        { id: 'a', groupIds: ['g1'] },
        { id: 'b', groupIds: ['g1'] },
        { id: 'c' },
        { id: 'd' },
      ])
      ctx.layerOrder.bringToFront(new Set(['a']))
      expect(ids(ctx)).toEqual(['c', 'd', 'a', 'b'])
    })

    it('sendToBack moves entire group when one member is selected', () => {
      using ctx = setup(0, [
        { id: 'a' },
        { id: 'b' },
        { id: 'c', groupIds: ['g1'] },
        { id: 'd', groupIds: ['g1'] },
      ])
      ctx.layerOrder.sendToBack(new Set(['d']))
      expect(ids(ctx)).toEqual(['c', 'd', 'a', 'b'])
    })

    it('bringForward moves entire group when one member is selected', () => {
      using ctx = setup(0, [
        { id: 'a', groupIds: ['g1'] },
        { id: 'b', groupIds: ['g1'] },
        { id: 'c' },
        { id: 'd' },
      ])
      ctx.layerOrder.bringForward(new Set(['a']))
      expect(ids(ctx)).toEqual(['c', 'a', 'b', 'd'])
    })

    it('sendBackward moves entire group when one member is selected', () => {
      using ctx = setup(0, [
        { id: 'a' },
        { id: 'b', groupIds: ['g1'] },
        { id: 'c', groupIds: ['g1'] },
        { id: 'd' },
      ])
      ctx.layerOrder.sendBackward(new Set(['c']))
      expect(ids(ctx)).toEqual(['b', 'c', 'a', 'd'])
    })

    it('preserves group member order when moving group to front', () => {
      using ctx = setup(0, [
        { id: 'x' },
        { id: 'a', groupIds: ['g1'] },
        { id: 'b', groupIds: ['g1'] },
        { id: 'c', groupIds: ['g1'] },
        { id: 'y' },
      ])
      ctx.layerOrder.bringToFront(new Set(['b']))
      expect(ids(ctx)).toEqual(['x', 'y', 'a', 'b', 'c'])
    })
  })
})
