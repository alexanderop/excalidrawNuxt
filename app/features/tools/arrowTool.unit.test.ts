import { shallowRef } from 'vue'
import { withSetup } from '~/__test-utils__/withSetup'
import { createTestArrowElement } from '~/__test-utils__/factories/element'
import { useDrawingInteraction } from './useDrawingInteraction'
import { hitTest, getElementAtPosition } from '~/features/selection/hitTest'
import { getElementBounds, getCommonBounds } from '~/features/selection/bounds'
import { createElement } from '~/features/elements/createElement'
import { mutateElement } from '~/features/elements/mutateElement'
import { generateShape, clearShapeCache } from '~/features/rendering/shapeGenerator'
import { createPoint } from '~/shared/math'
import type { ExcalidrawArrowElement, ExcalidrawElement } from '~/features/elements/types'
import type { ToolType } from './types'

// ---------- useDrawingInteraction helpers ----------

type EventHandler = (...args: unknown[]) => void
const eventHandlers = new Map<string, EventHandler>()

vi.mock('@vueuse/core', () => ({
  useEventListener: (_target: unknown, event: string, handler: EventHandler) => {
    eventHandlers.set(event, handler)
  },
}))

function firePointer(
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  x: number,
  y: number,
  opts: { shiftKey?: boolean; button?: number } = {},
) {
  const handler = eventHandlers.get(type)
  if (!handler) throw new Error(`No handler for ${type}`)
  handler({
    offsetX: x,
    offsetY: y,
    pointerId: 1,
    button: opts.button ?? 0,
    shiftKey: opts.shiftKey ?? false,
  })
}

function createCanvasStub(): HTMLCanvasElement {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- test stub
  return {
    setPointerCapture: vi.fn(),
    releasePointerCapture: vi.fn(),
  } as unknown as HTMLCanvasElement
}

function createDrawingSetup(tool: ToolType = 'arrow') {
  const canvasRef = shallowRef<HTMLCanvasElement | null>(createCanvasStub())
  const activeTool = shallowRef<ToolType>(tool)
  const onElementCreated = vi.fn()
  const markNewElementDirty = vi.fn()
  const markStaticDirty = vi.fn()
  const markInteractiveDirty = vi.fn()

  return {
    canvasRef,
    activeTool,
    spaceHeld: shallowRef(false),
    isPanning: shallowRef(false),
    toScene: (x: number, y: number) => ({ x, y }),
    onElementCreated,
    markNewElementDirty,
    markStaticDirty,
    markInteractiveDirty,
    elements: shallowRef<readonly ExcalidrawElement[]>([]),
    zoom: shallowRef(1),
    suggestedBindings: shallowRef<readonly ExcalidrawElement[]>([]),
  }
}

function getCreatedArrow(onElementCreated: ReturnType<typeof vi.fn>, callIndex = 0): ExcalidrawArrowElement {
  const el = onElementCreated.mock.calls[callIndex]![0]
  if (el.type !== 'arrow') throw new Error(`Expected arrow, got ${el.type}`)
  return el
}

// ---------- Tests ----------

describe('arrow tool integration', () => {
  // eslint-disable-next-line vitest/no-hooks -- shared handler map must be reset between tests
  beforeEach(() => {
    eventHandlers.clear()
  })

  describe('drawing an arrow via pointer events', () => {
    it('creates an arrow element after click-drag-release', () => {
      const opts = createDrawingSetup('arrow')

      using _ctx = withSetup(() => useDrawingInteraction(opts))

      firePointer('pointerdown', 50, 50)
      firePointer('pointermove', 200, 100)
      firePointer('pointerup', 200, 100)

      expect(opts.onElementCreated).toHaveBeenCalledTimes(1)

      const created = getCreatedArrow(opts.onElementCreated)
      expect(created.type).toBe('arrow')
    })

    it('stores start point as element x/y and offsets as points', () => {
      const opts = createDrawingSetup('arrow')

      using _ctx = withSetup(() => useDrawingInteraction(opts))

      firePointer('pointerdown', 30, 40)
      firePointer('pointermove', 130, 90)
      firePointer('pointerup', 130, 90)

      const arrow = getCreatedArrow(opts.onElementCreated)
      expect(arrow.x).toBe(30)
      expect(arrow.y).toBe(40)
      expect(arrow.points).toHaveLength(2)
      expect(arrow.points[0]).toEqual({ x: 0, y: 0 })
      expect(arrow.points[1]).toEqual({ x: 100, y: 50 })
    })

    it('sets width and height as absolute deltas', () => {
      const opts = createDrawingSetup('arrow')

      using _ctx = withSetup(() => useDrawingInteraction(opts))

      firePointer('pointerdown', 100, 100)
      firePointer('pointermove', 50, 200)
      firePointer('pointerup', 50, 200)

      const arrow = getCreatedArrow(opts.onElementCreated)
      expect(arrow.width).toBe(50)
      expect(arrow.height).toBe(100)
    })

    it('sets default arrowheads (none at start, arrow at end)', () => {
      const opts = createDrawingSetup('arrow')

      using _ctx = withSetup(() => useDrawingInteraction(opts))

      firePointer('pointerdown', 0, 0)
      firePointer('pointermove', 100, 50)
      firePointer('pointerup', 100, 50)

      const arrow = getCreatedArrow(opts.onElementCreated)
      expect(arrow.startArrowhead).toBeNull()
      expect(arrow.endArrowhead).toBe('arrow')
    })

    it('switches to selection tool after creating arrow', () => {
      const opts = createDrawingSetup('arrow')

      using _ctx = withSetup(() => useDrawingInteraction(opts))

      expect(opts.activeTool.value).toBe('arrow')

      firePointer('pointerdown', 10, 10)
      firePointer('pointermove', 110, 60)
      firePointer('pointerup', 110, 60)

      expect(opts.activeTool.value).toBe('selection')
    })

    it('clears newElement after drawing completes', () => {
      const opts = createDrawingSetup('arrow')

      using ctx = withSetup(() => useDrawingInteraction(opts))

      firePointer('pointerdown', 10, 10)
      firePointer('pointermove', 110, 60)

      expect(ctx.newElement.value).not.toBeNull()

      firePointer('pointerup', 110, 60)

      expect(ctx.newElement.value).toBeNull()
    })

    it('discards arrow that is too small (width <= 1 and height <= 1)', () => {
      const opts = createDrawingSetup('arrow')

      using _ctx = withSetup(() => useDrawingInteraction(opts))

      firePointer('pointerdown', 100, 100)
      firePointer('pointermove', 100, 100)
      firePointer('pointerup', 100, 100)

      expect(opts.onElementCreated).not.toHaveBeenCalled()
    })

    it('accepts arrow where only width > 1 (horizontal)', () => {
      const opts = createDrawingSetup('arrow')

      using _ctx = withSetup(() => useDrawingInteraction(opts))

      firePointer('pointerdown', 100, 100)
      firePointer('pointermove', 125, 100)
      firePointer('pointerup', 125, 100)

      expect(opts.onElementCreated).toHaveBeenCalledTimes(1)
    })

    it('accepts arrow where only height > 1 (vertical)', () => {
      const opts = createDrawingSetup('arrow')

      using _ctx = withSetup(() => useDrawingInteraction(opts))

      firePointer('pointerdown', 100, 100)
      firePointer('pointermove', 100, 125)
      firePointer('pointerup', 100, 125)

      expect(opts.onElementCreated).toHaveBeenCalledTimes(1)
    })

    it('snaps angle to 15° increments when Shift is held', () => {
      const opts = createDrawingSetup('arrow')

      using _ctx = withSetup(() => useDrawingInteraction(opts))

      // Drag at roughly 20° — should snap to either 15° or 30°
      firePointer('pointerdown', 0, 0)
      firePointer('pointermove', 100, 36, { shiftKey: true })
      firePointer('pointerup', 100, 36, { shiftKey: true })

      const arrow = getCreatedArrow(opts.onElementCreated)
      const endPt = arrow.points[1]!
      const angle = Math.atan2(endPt.y, endPt.x)
      const snappedDeg = Math.round((angle * 180) / Math.PI)

      // Should snap to a 15° multiple
      expect(snappedDeg % 15).toBe(0)
    })

    it('does not create arrow on right-click', () => {
      const opts = createDrawingSetup('arrow')

      using _ctx = withSetup(() => useDrawingInteraction(opts))

      const handler = eventHandlers.get('pointerdown')!
      handler({ offsetX: 10, offsetY: 10, pointerId: 1, button: 2, shiftKey: false })
      firePointer('pointermove', 200, 200)
      firePointer('pointerup', 200, 200)

      expect(opts.onElementCreated).not.toHaveBeenCalled()
    })

    it('does not start drawing while panning', () => {
      const opts = createDrawingSetup('arrow')
      opts.isPanning.value = true

      using _ctx = withSetup(() => useDrawingInteraction(opts))

      firePointer('pointerdown', 10, 10)
      firePointer('pointermove', 200, 200)
      firePointer('pointerup', 200, 200)

      expect(opts.onElementCreated).not.toHaveBeenCalled()
    })

    it('does not start drawing while space is held', () => {
      const opts = createDrawingSetup('arrow')
      opts.spaceHeld.value = true

      using _ctx = withSetup(() => useDrawingInteraction(opts))

      firePointer('pointerdown', 10, 10)
      firePointer('pointermove', 200, 200)
      firePointer('pointerup', 200, 200)

      expect(opts.onElementCreated).not.toHaveBeenCalled()
    })
  })

  describe('arrow element creation via createElement', () => {
    it('creates arrow with single initial point at [0,0]', () => {
      const el = createElement('arrow', 50, 75)

      expect(el.type).toBe('arrow')
      // eslint-disable-next-line vitest/no-conditional-in-test -- type narrowing for TypeScript
      if (el.type !== 'arrow') throw new Error('Expected arrow')
      expect(el.points).toEqual([{ x: 0, y: 0 }])
      expect(el.x).toBe(50)
      expect(el.y).toBe(75)
    })

    it('defaults endArrowhead to "arrow" and startArrowhead to null', () => {
      const el = createElement('arrow', 0, 0)

      // eslint-disable-next-line vitest/no-conditional-in-test -- type narrowing for TypeScript
      if (el.type !== 'arrow') throw new Error('Expected arrow')
      expect(el.endArrowhead).toBe('arrow')
      expect(el.startArrowhead).toBeNull()
    })

    it('initializes width and height to 0', () => {
      const el = createElement('arrow', 10, 20)

      expect(el.width).toBe(0)
      expect(el.height).toBe(0)
    })
  })

  describe('arrow mutation', () => {
    it('updates points array via mutateElement', () => {
      const arrow = createTestArrowElement()
      const newPoints = [createPoint(0, 0), createPoint(200, 150)]

      mutateElement(arrow, { points: newPoints })

      expect(arrow.points).toEqual(newPoints)
    })

    it('bumps versionNonce on mutation', () => {
      const arrow = createTestArrowElement({ versionNonce: 100 })

      mutateElement(arrow, { x: 50 })

      expect(arrow.versionNonce).not.toBe(100)
    })
  })

  describe('arrow hit testing', () => {
    it('hits point on the arrow shaft', () => {
      const arrow = createTestArrowElement({
        x: 0, y: 0,
        points: [createPoint(0, 0), createPoint(100, 0)],
        width: 100, height: 0,
      })

      // midpoint of horizontal arrow
      expect(hitTest({ x: 50, y: 0 }, arrow, 1)).toBe(true)
    })

    it('hits near the arrow shaft within threshold', () => {
      const arrow = createTestArrowElement({
        x: 0, y: 0,
        points: [createPoint(0, 0), createPoint(100, 0)],
        width: 100, height: 0,
        strokeWidth: 2,
      })

      // 5px away from horizontal arrow — within threshold (max(1+0.1, 10/1) = 10)
      expect(hitTest({ x: 50, y: 5 }, arrow, 1)).toBe(true)
    })

    it('misses point far from the arrow shaft', () => {
      const arrow = createTestArrowElement({
        x: 0, y: 0,
        points: [createPoint(0, 0), createPoint(100, 0)],
        width: 100, height: 0,
      })

      expect(hitTest({ x: 50, y: 50 }, arrow, 1)).toBe(false)
    })

    it('hits diagonal arrow at midpoint', () => {
      const arrow = createTestArrowElement({
        x: 0, y: 0,
        points: [createPoint(0, 0), createPoint(100, 100)],
        width: 100, height: 100,
      })

      expect(hitTest({ x: 50, y: 50 }, arrow, 1)).toBe(true)
    })

    it('hits vertical arrow', () => {
      const arrow = createTestArrowElement({
        x: 50, y: 0,
        points: [createPoint(0, 0), createPoint(0, 200)],
        width: 0, height: 200,
      })

      expect(hitTest({ x: 50, y: 100 }, arrow, 1)).toBe(true)
    })

    it('threshold grows at low zoom', () => {
      const arrow = createTestArrowElement({
        x: 0, y: 0,
        points: [createPoint(0, 0), createPoint(100, 0)],
        width: 100, height: 0,
      })

      // 25px away — misses at zoom=1 (threshold ~10)
      expect(hitTest({ x: 50, y: 25 }, arrow, 1)).toBe(false)
      // hits at zoom=0.2 (threshold = 10/0.2 = 50)
      expect(hitTest({ x: 50, y: 25 }, arrow, 0.2)).toBe(true)
    })

    it('skips deleted arrow', () => {
      const arrow = createTestArrowElement({
        x: 0, y: 0,
        points: [createPoint(0, 0), createPoint(100, 0)],
        width: 100, height: 0,
        isDeleted: true,
      })

      expect(hitTest({ x: 50, y: 0 }, arrow, 1)).toBe(false)
    })

    it('hits start point of arrow', () => {
      const arrow = createTestArrowElement({
        x: 10, y: 20,
        points: [createPoint(0, 0), createPoint(100, 50)],
        width: 100, height: 50,
      })

      expect(hitTest({ x: 10, y: 20 }, arrow, 1)).toBe(true)
    })

    it('hits end point of arrow', () => {
      const arrow = createTestArrowElement({
        x: 10, y: 20,
        points: [createPoint(0, 0), createPoint(100, 50)],
        width: 100, height: 50,
      })

      expect(hitTest({ x: 110, y: 70 }, arrow, 1)).toBe(true)
    })
  })

  describe('arrow bounds', () => {
    it('returns bounds for horizontal arrow', () => {
      const arrow = createTestArrowElement({
        x: 10, y: 20,
        points: [createPoint(0, 0), createPoint(100, 0)],
      })

      expect(getElementBounds(arrow)).toEqual([10, 20, 110, 20])
    })

    it('returns bounds for vertical arrow', () => {
      const arrow = createTestArrowElement({
        x: 10, y: 20,
        points: [createPoint(0, 0), createPoint(0, 80)],
      })

      expect(getElementBounds(arrow)).toEqual([10, 20, 10, 100])
    })

    it('returns bounds for diagonal arrow', () => {
      const arrow = createTestArrowElement({
        x: 10, y: 20,
        points: [createPoint(0, 0), createPoint(50, 30)],
      })

      expect(getElementBounds(arrow)).toEqual([10, 20, 60, 50])
    })

    it('handles arrow pointing in negative direction', () => {
      const arrow = createTestArrowElement({
        x: 100, y: 100,
        points: [createPoint(0, 0), createPoint(-80, -60)],
      })

      expect(getElementBounds(arrow)).toEqual([20, 40, 100, 100])
    })

    it('includes arrow in common bounds with other elements', () => {
      const arrow = createTestArrowElement({
        id: 'arrow-1',
        x: 200, y: 200,
        points: [createPoint(0, 0), createPoint(100, 50)],
        width: 100, height: 50,
      })

      const rect: ExcalidrawElement = {
        id: 'rect-1',
        type: 'rectangle',
        x: 0, y: 0, width: 50, height: 50,
        angle: 0, strokeColor: '#000', backgroundColor: 'transparent',
        fillStyle: 'hachure', strokeWidth: 2, roughness: 1, opacity: 100,
        seed: 1, versionNonce: 1, isDeleted: false, boundElements: [],
      }

      expect(getCommonBounds([rect, arrow])).toEqual([0, 0, 300, 250])
    })
  })

  describe('arrow shape generation', () => {
    // eslint-disable-next-line vitest/no-hooks -- cache must be reset between shape tests
    beforeEach(() => {
      clearShapeCache()
    })

    it('generates a linearPath drawable for arrow', () => {
      const arrow = createTestArrowElement()
      const drawable = generateShape(arrow)

      expect(drawable).toBeDefined()
      expect(drawable.shape).toBe('linearPath')
      expect(drawable.sets.length).toBeGreaterThan(0)
    })

    it('passes style options from element to rough', () => {
      const arrow = createTestArrowElement({
        strokeColor: '#ff0000',
        strokeWidth: 4,
        roughness: 2,
        seed: 42,
      })
      const drawable = generateShape(arrow)

      expect(drawable.options.stroke).toBe('#ff0000')
      expect(drawable.options.strokeWidth).toBe(4)
      expect(drawable.options.roughness).toBe(2)
      expect(drawable.options.seed).toBe(42)
    })

    it('caches drawable by id and versionNonce', () => {
      const arrow = createTestArrowElement()
      const first = generateShape(arrow)
      const second = generateShape(arrow)

      expect(first).toBe(second)
    })

    it('invalidates cache when versionNonce changes', () => {
      const arrow = createTestArrowElement({ versionNonce: 1 })
      const first = generateShape(arrow)

      const updated = createTestArrowElement({ versionNonce: 2 })
      const second = generateShape(updated)

      expect(first).not.toBe(second)
    })
  })

  describe('getElementAtPosition with arrows', () => {
    it('selects arrow when clicking on its shaft', () => {
      const arrow = createTestArrowElement({
        id: 'arrow-1',
        x: 0, y: 0,
        points: [createPoint(0, 0), createPoint(200, 0)],
        width: 200, height: 0,
      })

      const found = getElementAtPosition({ x: 100, y: 0 }, [arrow], 1)
      expect(found?.id).toBe('arrow-1')
    })

    it('prefers topmost arrow when overlapping', () => {
      const bottom = createTestArrowElement({
        id: 'bottom',
        x: 0, y: 0,
        points: [createPoint(0, 0), createPoint(200, 200)],
        width: 200, height: 200,
      })
      const top = createTestArrowElement({
        id: 'top',
        x: 0, y: 0,
        points: [createPoint(0, 0), createPoint(200, 200)],
        width: 200, height: 200,
      })

      const found = getElementAtPosition({ x: 100, y: 100 }, [bottom, top], 1)
      expect(found?.id).toBe('top')
    })

    it('selects arrow when mixed with shapes', () => {
      const rect: ExcalidrawElement = {
        id: 'rect-1',
        type: 'rectangle',
        x: 0, y: 0, width: 100, height: 100,
        angle: 0, strokeColor: '#000', backgroundColor: 'transparent',
        fillStyle: 'hachure', strokeWidth: 2, roughness: 1, opacity: 100,
        seed: 1, versionNonce: 1, isDeleted: false, boundElements: [],
      }
      const arrow = createTestArrowElement({
        id: 'arrow-1',
        x: 0, y: 50,
        points: [createPoint(0, 0), createPoint(200, 0)],
        width: 200, height: 0,
      })

      // Click on arrow shaft at x=150 (outside the rect)
      const found = getElementAtPosition({ x: 150, y: 50 }, [rect, arrow], 1)
      expect(found?.id).toBe('arrow-1')
    })
  })

  describe('full draw-then-select flow', () => {
    it('arrow drawn via interaction is selectable by hitTest', () => {
      const opts = createDrawingSetup('arrow')

      using _ctx = withSetup(() => useDrawingInteraction(opts))

      // Draw arrow from (10,20) to (210,120)
      firePointer('pointerdown', 10, 20)
      firePointer('pointermove', 210, 120)
      firePointer('pointerup', 210, 120)

      const arrow = getCreatedArrow(opts.onElementCreated)

      // Midpoint of arrow shaft in scene coordinates
      expect(hitTest({ x: 110, y: 70 }, arrow, 1)).toBe(true)
    })

    it('arrow drawn via interaction has correct bounds', () => {
      const opts = createDrawingSetup('arrow')

      using _ctx = withSetup(() => useDrawingInteraction(opts))

      firePointer('pointerdown', 20, 30)
      firePointer('pointermove', 120, 80)
      firePointer('pointerup', 120, 80)

      const arrow = getCreatedArrow(opts.onElementCreated)
      const bounds = getElementBounds(arrow)

      expect(bounds).toEqual([20, 30, 120, 80])
    })

    it('arrow drawn via interaction generates a valid shape', () => {
      clearShapeCache()
      const opts = createDrawingSetup('arrow')

      using _ctx = withSetup(() => useDrawingInteraction(opts))

      firePointer('pointerdown', 0, 0)
      firePointer('pointermove', 150, 75)
      firePointer('pointerup', 150, 75)

      const arrow = getCreatedArrow(opts.onElementCreated)
      const drawable = generateShape(arrow)

      expect(drawable).toBeDefined()
      expect(drawable.shape).toBe('linearPath')
    })
  })
})
