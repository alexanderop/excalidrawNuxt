import { withSetup } from '~/__test-utils__/withSetup'
import { useViewport } from './useViewport'

describe('useViewport', () => {
  let result: ReturnType<typeof useViewport>
  let teardown: () => void

  beforeEach(() => {
    [result, teardown] = withSetup(() => useViewport())
  })

  afterEach(() => {
    teardown()
  })

  describe('default state', () => {
    it('has scrollX of 0', () => {
      expect(result.scrollX.value).toBe(0)
    })

    it('has scrollY of 0', () => {
      expect(result.scrollY.value).toBe(0)
    })

    it('has zoom of 1', () => {
      expect(result.zoom.value).toBe(1)
    })

    it('has a viewport computed matching the refs', () => {
      expect(result.viewport.value).toEqual({ scrollX: 0, scrollY: 0, zoom: 1 })
    })
  })

  describe('panBy', () => {
    it('adjusts scroll by dx and dy at zoom 1', () => {
      result.panBy(100, 50)
      expect(result.scrollX.value).toBe(100)
      expect(result.scrollY.value).toBe(50)
    })

    it('scales panning by inverse zoom at zoom 2', () => {
      result.zoom.value = 2
      result.panBy(100, 50)
      expect(result.scrollX.value).toBe(50)
      expect(result.scrollY.value).toBe(25)
    })

    it('accumulates multiple pans', () => {
      result.panBy(10, 20)
      result.panBy(30, 40)
      expect(result.scrollX.value).toBe(40)
      expect(result.scrollY.value).toBe(60)
    })

    it('handles negative deltas', () => {
      result.panBy(-50, -25)
      expect(result.scrollX.value).toBe(-50)
      expect(result.scrollY.value).toBe(-25)
    })
  })

  describe('zoomTo', () => {
    it('sets the zoom value', () => {
      result.zoomTo(2)
      expect(result.zoom.value).toBe(2)
    })

    it('clamps zoom below to 0.1', () => {
      result.zoomTo(0.01)
      expect(result.zoom.value).toBeCloseTo(0.1)
    })

    it('clamps zoom above to 30', () => {
      result.zoomTo(100)
      expect(result.zoom.value).toBe(30)
    })

    it('keeps scene point stable when center is provided', () => {
      result.scrollX.value = 50
      result.scrollY.value = 50
      result.zoom.value = 1

      const center = { x: 200, y: 200 }
      const sceneBefore = result.toScene(center.x, center.y)

      result.zoomTo(2, center)

      const sceneAfter = result.toScene(center.x, center.y)
      expect(sceneAfter.x).toBeCloseTo(sceneBefore.x)
      expect(sceneAfter.y).toBeCloseTo(sceneBefore.y)
    })

    it('does not adjust scroll when no center is provided', () => {
      result.scrollX.value = 50
      result.scrollY.value = 30
      result.zoomTo(3)
      expect(result.scrollX.value).toBe(50)
      expect(result.scrollY.value).toBe(30)
    })
  })

  describe('zoomBy', () => {
    it('zooms by delta from current zoom', () => {
      result.zoomBy(0.5)
      expect(result.zoom.value).toBeCloseTo(1.5)
    })

    it('zooms by negative delta', () => {
      result.zoomBy(-0.5)
      expect(result.zoom.value).toBeCloseTo(0.5)
    })

    it('respects zoom clamping', () => {
      result.zoomBy(-0.99)
      expect(result.zoom.value).toBeCloseTo(0.1)
    })

    it('passes center to zoomTo for stable zoom point', () => {
      result.scrollX.value = 20
      result.scrollY.value = 20
      const center = { x: 100, y: 100 }
      const sceneBefore = result.toScene(center.x, center.y)

      result.zoomBy(1, center)

      const sceneAfter = result.toScene(center.x, center.y)
      expect(sceneAfter.x).toBeCloseTo(sceneBefore.x)
      expect(sceneAfter.y).toBeCloseTo(sceneBefore.y)
    })
  })

  describe('toScene and toScreen', () => {
    it('toScene converts screen to scene coordinates', () => {
      result.scrollX.value = 10
      result.zoom.value = 2
      const scene = result.toScene(100, 200)
      expect(scene.x).toBe(40)
      expect(scene.y).toBe(100)
    })

    it('toScreen converts scene to screen coordinates', () => {
      result.scrollX.value = 10
      result.zoom.value = 2
      const screen = result.toScreen(100, 200)
      expect(screen.x).toBe(220)
      expect(screen.y).toBe(400)
    })

    it('round-trips screen -> scene -> screen', () => {
      result.scrollX.value = 37
      result.scrollY.value = -42
      result.zoom.value = 1.7

      const screenX = 300
      const screenY = 450
      const scene = result.toScene(screenX, screenY)
      const back = result.toScreen(scene.x, scene.y)

      expect(back.x).toBeCloseTo(screenX)
      expect(back.y).toBeCloseTo(screenY)
    })
  })
})
