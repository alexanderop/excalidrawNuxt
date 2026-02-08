import { withSetup } from '~/__test-utils__/withSetup'
import { createTestPoint } from '~/__test-utils__/factories/point'
import { useViewport } from './useViewport'

describe('useViewport', () => {
  describe('default state', () => {
    it('has scrollX of 0', () => {
      using vp = withSetup(() => useViewport())
      expect(vp.scrollX.value).toBe(0)
    })

    it('has scrollY of 0', () => {
      using vp = withSetup(() => useViewport())
      expect(vp.scrollY.value).toBe(0)
    })

    it('has zoom of 1', () => {
      using vp = withSetup(() => useViewport())
      expect(vp.zoom.value).toBe(1)
    })

    it('has a viewport computed matching the refs', () => {
      using vp = withSetup(() => useViewport())
      expect(vp.viewport.value).toEqual({ scrollX: 0, scrollY: 0, zoom: 1 })
    })
  })

  describe('panBy', () => {
    it('adjusts scroll by dx and dy at zoom 1', () => {
      using vp = withSetup(() => useViewport())
      vp.panBy(100, 50)
      expect(vp.scrollX.value).toBe(100)
      expect(vp.scrollY.value).toBe(50)
    })

    it('scales panning by inverse zoom at zoom 2', () => {
      using vp = withSetup(() => useViewport())
      vp.zoom.value = 2
      vp.panBy(100, 50)
      expect(vp.scrollX.value).toBe(50)
      expect(vp.scrollY.value).toBe(25)
    })

    it('accumulates multiple pans', () => {
      using vp = withSetup(() => useViewport())
      vp.panBy(10, 20)
      vp.panBy(30, 40)
      expect(vp.scrollX.value).toBe(40)
      expect(vp.scrollY.value).toBe(60)
    })

    it('handles negative deltas', () => {
      using vp = withSetup(() => useViewport())
      vp.panBy(-50, -25)
      expect(vp.scrollX.value).toBe(-50)
      expect(vp.scrollY.value).toBe(-25)
    })
  })

  describe('zoomTo', () => {
    it('sets the zoom value', () => {
      using vp = withSetup(() => useViewport())
      vp.zoomTo(2)
      expect(vp.zoom.value).toBe(2)
    })

    it('clamps zoom below to 0.1', () => {
      using vp = withSetup(() => useViewport())
      vp.zoomTo(0.01)
      expect(vp.zoom.value).toBeCloseTo(0.1)
    })

    it('clamps zoom above to 30', () => {
      using vp = withSetup(() => useViewport())
      vp.zoomTo(100)
      expect(vp.zoom.value).toBe(30)
    })

    it('keeps scene point stable when center is provided', () => {
      using vp = withSetup(() => useViewport())
      vp.scrollX.value = 50
      vp.scrollY.value = 50
      vp.zoom.value = 1

      const center = createTestPoint(200, 200)
      const sceneBefore = vp.toScene(center[0], center[1])

      vp.zoomTo(2, center)

      const sceneAfter = vp.toScene(center[0], center[1])
      expect(sceneAfter[0]).toBeCloseTo(sceneBefore[0])
      expect(sceneAfter[1]).toBeCloseTo(sceneBefore[1])
    })

    it('does not adjust scroll when no center is provided', () => {
      using vp = withSetup(() => useViewport())
      vp.scrollX.value = 50
      vp.scrollY.value = 30
      vp.zoomTo(3)
      expect(vp.scrollX.value).toBe(50)
      expect(vp.scrollY.value).toBe(30)
    })
  })

  describe('zoomBy', () => {
    it('zooms by delta from current zoom', () => {
      using vp = withSetup(() => useViewport())
      vp.zoomBy(0.5)
      expect(vp.zoom.value).toBeCloseTo(1.5)
    })

    it('zooms by negative delta', () => {
      using vp = withSetup(() => useViewport())
      vp.zoomBy(-0.5)
      expect(vp.zoom.value).toBeCloseTo(0.5)
    })

    it('respects zoom clamping', () => {
      using vp = withSetup(() => useViewport())
      vp.zoomBy(-0.99)
      expect(vp.zoom.value).toBeCloseTo(0.1)
    })

    it('passes center to zoomTo for stable zoom point', () => {
      using vp = withSetup(() => useViewport())
      vp.scrollX.value = 20
      vp.scrollY.value = 20
      const center = createTestPoint(100, 100)
      const sceneBefore = vp.toScene(center[0], center[1])

      vp.zoomBy(1, center)

      const sceneAfter = vp.toScene(center[0], center[1])
      expect(sceneAfter[0]).toBeCloseTo(sceneBefore[0])
      expect(sceneAfter[1]).toBeCloseTo(sceneBefore[1])
    })
  })

  describe('toScene and toScreen', () => {
    it('toScene converts screen to scene coordinates', () => {
      using vp = withSetup(() => useViewport())
      vp.scrollX.value = 10
      vp.zoom.value = 2
      const scene = vp.toScene(100, 200)
      expect(scene[0]).toBe(40)
      expect(scene[1]).toBe(100)
    })

    it('toScreen converts scene to screen coordinates', () => {
      using vp = withSetup(() => useViewport())
      vp.scrollX.value = 10
      vp.zoom.value = 2
      const screen = vp.toScreen(100, 200)
      expect(screen[0]).toBe(220)
      expect(screen[1]).toBe(400)
    })

    it('round-trips screen -> scene -> screen', () => {
      using vp = withSetup(() => useViewport())
      vp.scrollX.value = 37
      vp.scrollY.value = -42
      vp.zoom.value = 1.7

      const screenX = 300
      const screenY = 450
      const scene = vp.toScene(screenX, screenY)
      const back = vp.toScreen(scene[0], scene[1])

      expect(back[0]).toBeCloseTo(screenX)
      expect(back[1]).toBeCloseTo(screenY)
    })
  })
})
