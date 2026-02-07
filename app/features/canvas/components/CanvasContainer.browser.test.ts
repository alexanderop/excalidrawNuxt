import { render } from 'vitest-browser-vue'
import CanvasContainer from './CanvasContainer.vue'

describe('CanvasContainer', () => {
  it('mounts without error', async () => {
    const screen = render(CanvasContainer)
    expect(screen).toBeTruthy()
  })
})
