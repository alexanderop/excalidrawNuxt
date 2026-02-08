import { render } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import CanvasContainer from '~/features/canvas/components/CanvasContainer.vue'

describe('DrawingToolbar numeric shortcuts', () => {
  it('pressing 1 activates the selection tool', async () => {
    const screen = render(CanvasContainer)

    await userEvent.keyboard('1')

    const selectionBtn = screen.getByRole('button', { name: 'Selection' })
    await expect.element(selectionBtn).toHaveAttribute('aria-pressed', 'true')
  })

  it('pressing 2 activates the rectangle tool', async () => {
    const screen = render(CanvasContainer)

    await userEvent.keyboard('2')

    const rectangleBtn = screen.getByRole('button', { name: 'Rectangle' })
    await expect.element(rectangleBtn).toHaveAttribute('aria-pressed', 'true')
  })

  it('pressing 3 activates the diamond tool', async () => {
    const screen = render(CanvasContainer)

    await userEvent.keyboard('3')

    const diamondBtn = screen.getByRole('button', { name: 'Diamond' })
    await expect.element(diamondBtn).toHaveAttribute('aria-pressed', 'true')
  })

  it('pressing 4 activates the ellipse tool', async () => {
    const screen = render(CanvasContainer)

    await userEvent.keyboard('4')

    const ellipseBtn = screen.getByRole('button', { name: 'Ellipse' })
    await expect.element(ellipseBtn).toHaveAttribute('aria-pressed', 'true')
  })
})
