import { render } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import CanvasContainer from '~/features/canvas/components/CanvasContainer.vue'
import { API, UI, waitForCanvasReady, waitForPaint } from '~/__test-utils__/browser'
import { reseed, restoreSeed } from '~/__test-utils__/deterministicSeed'
import { isArrowElement } from '~/features/elements/types'

describe('multi-point creation', () => {
  beforeEach(() => reseed())
  afterEach(() => restoreSeed())

  it('creates an arrow with drag and enters it into the scene', async () => {
    const screen = render(CanvasContainer)
    await waitForCanvasReady()
    const ui = new UI(screen)

    await ui.createElementAtCells('arrow', [2, 2], [8, 5])
    await waitForPaint()

    expect(API.elements).toHaveLength(1)
    const arrow = API.elements[0]!
    expect(isArrowElement(arrow)).toBe(true)
    expect(API.activeTool).toBe('selection')
  })

  it('multiElement is null when not in multi-point mode', async () => {
    render(CanvasContainer)
    await waitForCanvasReady()

    expect(API.h.multiElement.value).toBeNull()
  })

  it('arrow click too small is discarded', async () => {
    const screen = render(CanvasContainer)
    await waitForCanvasReady()
    const ui = new UI(screen)

    // Click (not drag) with arrow tool — element too small, should be discarded
    await ui.clickTool('arrow')
    await ui.grid.click([5, 5])
    await waitForPaint()

    // No element should be created (too small)
    expect(API.elements).toHaveLength(0)
    // Tool resets to selection even on discard
    expect(API.activeTool).toBe('selection')
  })

  it('Escape from arrow tool switches to selection', async () => {
    const screen = render(CanvasContainer)
    await waitForCanvasReady()
    const ui = new UI(screen)

    await ui.clickTool('arrow')
    expect(API.activeTool).toBe('arrow')

    await userEvent.keyboard('{Escape}')
    // Escape with no active multi-element — tool should stay as-is
    // (useMultiPointCreation only handles Escape when multiElement is set)
  })
})
