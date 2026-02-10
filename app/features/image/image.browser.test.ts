import { page as vitestPage } from 'vitest/browser'
import { onTestFinished } from 'vitest'
import { CanvasPage, API } from '~/__test-utils__/browser'
import { createElement } from '~/features/elements/createElement'
import { useImageCache } from '~/features/image/useImageCache'
import type { FileId } from '~/features/image/types'

/**
 * Create a solid-colored test image as an HTMLImageElement.
 * Uses an offscreen canvas to produce a deterministic image.
 */
function createTestImage(
  width: number,
  height: number,
  color: string,
): Promise<HTMLImageElement> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = color
  ctx.fillRect(0, 0, width, height)

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', reject)
    img.src = canvas.toDataURL('image/png')
  })
}

/** Populate the image cache with a test image; auto-resets on test finish. */
async function addTestImage(fileId: FileId, width: number, height: number, color: string): Promise<void> {
  const { addImage, $reset } = useImageCache()
  const img = await createTestImage(width, height, color)
  addImage(fileId, img, 'image/png')
  onTestFinished(() => $reset())
}

describe('image rendering', () => {
  it('renders image placeholder when no cached image exists', async () => {
    const page = await CanvasPage.create()

    const el = createElement('image', 200, 150, {
      width: 300,
      height: 200,
    })
    API.h.addElement(el)
    await page.scene.flush()

    await expect(vitestPage.getByTestId('canvas-container')).toMatchScreenshot('image-placeholder')
  })

  it('renders cached image on canvas', async () => {
    const page = await CanvasPage.create()

    const fileId = 'test-file-1' as FileId
    await addTestImage(fileId, 400, 300, '#6c5ce7')

    const el = createElement('image', 150, 100, {
      width: 300,
      height: 225,
      fileId,
      status: 'saved',
    })
    API.h.addElement(el)
    await page.scene.flush()

    await expect(vitestPage.getByTestId('canvas-container')).toMatchScreenshot('image-cached')
  })

  it('renders selected image with handles', async () => {
    const page = await CanvasPage.create()

    const fileId = 'test-file-2' as FileId
    await addTestImage(fileId, 200, 200, '#00b894')

    const el = createElement('image', 200, 150, {
      width: 250,
      height: 250,
      fileId,
      status: 'saved',
    })
    API.h.addElement(el)
    API.setSelectedElements([el])
    await page.scene.flush()

    await expect(vitestPage.getByTestId('canvas-container')).toMatchScreenshot('image-selected-handles')
  })

  it('renders multiple images alongside a shape', async () => {
    const page = await CanvasPage.create()

    // Row 1: hand-drawn rectangle (left)
    page.scene.addElement({ x: 40, y: 100, width: 200, height: 140 })

    // Row 1: cached orange image (right)
    const fileId1 = 'test-file-3' as FileId
    await addTestImage(fileId1, 300, 200, '#e17055')
    API.h.addElement(createElement('image', 280, 100, {
      width: 200,
      height: 140,
      fileId: fileId1,
      status: 'saved',
    }))

    // Row 2: placeholder image (left)
    API.h.addElement(createElement('image', 40, 300, {
      width: 200,
      height: 140,
    }))

    // Row 2: cached blue image (right)
    const fileId2 = 'test-file-4' as FileId
    await addTestImage(fileId2, 200, 200, '#0984e3')
    API.h.addElement(createElement('image', 280, 300, {
      width: 200,
      height: 140,
      fileId: fileId2,
      status: 'saved',
    }))

    await page.scene.flush()

    await expect(vitestPage.getByTestId('canvas-container')).toMatchScreenshot('images-with-shapes')
  })
})
