import { screenToScene, sceneToScreen } from '~/features/canvas/coords'
import { createViewport } from '~/__test-utils__/factories/viewport'

describe('coords', () => {
  describe('screenToScene', () => {
    it('returns unchanged coords with identity viewport', () => {
      const vp = createViewport()
      const result = screenToScene(100, 200, vp)
      expect(result).toEqual([100, 200])
    })

    it('applies scroll offset', () => {
      const vp = createViewport({ scrollX: 50, scrollY: 30 })
      const result = screenToScene(100, 200, vp)
      expect(result).toEqual([50, 170])
    })

    it('applies zoom', () => {
      const vp = createViewport({ zoom: 2 })
      const result = screenToScene(100, 200, vp)
      expect(result).toEqual([50, 100])
    })

    it('applies combined scroll and zoom', () => {
      const vp = createViewport({ scrollX: 10, scrollY: 20, zoom: 2 })
      const result = screenToScene(100, 200, vp)
      expect(result).toEqual([40, 80])
    })

    it('handles zero screen coordinates', () => {
      const vp = createViewport({ scrollX: 50, scrollY: 30, zoom: 2 })
      const result = screenToScene(0, 0, vp)
      expect(result).toEqual([-50, -30])
    })

    it('handles fractional zoom', () => {
      const vp = createViewport({ zoom: 0.5 })
      const result = screenToScene(100, 200, vp)
      expect(result).toEqual([200, 400])
    })
  })

  describe('sceneToScreen', () => {
    it('returns unchanged coords with identity viewport', () => {
      const vp = createViewport()
      const result = sceneToScreen(100, 200, vp)
      expect(result).toEqual([100, 200])
    })

    it('applies scroll offset', () => {
      const vp = createViewport({ scrollX: 50, scrollY: 30 })
      const result = sceneToScreen(100, 200, vp)
      expect(result).toEqual([150, 230])
    })

    it('applies zoom', () => {
      const vp = createViewport({ zoom: 2 })
      const result = sceneToScreen(100, 200, vp)
      expect(result).toEqual([200, 400])
    })

    it('applies combined scroll and zoom', () => {
      const vp = createViewport({ scrollX: 10, scrollY: 20, zoom: 2 })
      const result = sceneToScreen(100, 200, vp)
      expect(result).toEqual([220, 440])
    })

    it('handles zero scene coordinates', () => {
      const vp = createViewport({ scrollX: 50, scrollY: 30, zoom: 2 })
      const result = sceneToScreen(0, 0, vp)
      expect(result).toEqual([100, 60])
    })
  })

  describe('round-trip invariants', () => {
    const viewports = [
      createViewport(),
      createViewport({ scrollX: 100, scrollY: -50, zoom: 1 }),
      createViewport({ scrollX: 0, scrollY: 0, zoom: 2 }),
      createViewport({ scrollX: -30, scrollY: 45, zoom: 0.5 }),
      createViewport({ scrollX: 123.456, scrollY: -789.012, zoom: 3.7 }),
    ]

    for (const vp of viewports) {
      it(`screen->scene->screen round-trip with viewport ${JSON.stringify(vp)}`, () => {
        const screenX = 250
        const screenY = 175
        const scene = screenToScene(screenX, screenY, vp)
        const back = sceneToScreen(scene[0], scene[1], vp)
        expect(back[0]).toBeCloseTo(screenX)
        expect(back[1]).toBeCloseTo(screenY)
      })

      it(`scene->screen->scene round-trip with viewport ${JSON.stringify(vp)}`, () => {
        const sceneX = 400
        const sceneY = -300
        const screen = sceneToScreen(sceneX, sceneY, vp)
        const back = screenToScene(screen[0], screen[1], vp)
        expect(back[0]).toBeCloseTo(sceneX)
        expect(back[1]).toBeCloseTo(sceneY)
      })
    }
  })
})
