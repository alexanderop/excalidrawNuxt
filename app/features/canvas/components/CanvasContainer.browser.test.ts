import { render } from 'vitest-browser-vue'
import CanvasContainer from './CanvasContainer.vue'

describe('CanvasContainer', () => {
  it('renders the interactive canvas', async () => {
    const screen = render(CanvasContainer)
    const canvas = screen.getByTestId('interactive-canvas')
    await expect.element(canvas).toBeVisible()
  })

  it('renders the drawing toolbar with expected tool buttons', async () => {
    const screen = render(CanvasContainer)
    const handBtn = screen.getByRole('button', { name: 'Hand' })
    const selectionBtn = screen.getByRole('button', { name: 'Selection' })
    const rectangleBtn = screen.getByRole('button', { name: 'Rectangle' })
    const diamondBtn = screen.getByRole('button', { name: 'Diamond' })
    const ellipseBtn = screen.getByRole('button', { name: 'Ellipse' })
    const arrowBtn = screen.getByRole('button', { name: 'Arrow' })
    await expect.element(handBtn).toBeVisible()
    await expect.element(selectionBtn).toBeVisible()
    await expect.element(rectangleBtn).toBeVisible()
    await expect.element(diamondBtn).toBeVisible()
    await expect.element(ellipseBtn).toBeVisible()
    await expect.element(arrowBtn).toBeVisible()
  })

  it('defaults to selection tool being active', async () => {
    const screen = render(CanvasContainer)
    const selectionBtn = screen.getByRole('button', { name: 'Selection' })
    await expect.element(selectionBtn).toHaveAttribute('aria-pressed', 'true')
  })
})
