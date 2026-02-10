import type { ExcalidrawElement } from '~/features/elements/types'
import type {
  ExcalidrawImageElement,
  InitializedExcalidrawImageElement,
} from '@excalidraw/element/types'

export type { FileId, ExcalidrawImageElement, InitializedExcalidrawImageElement } from '@excalidraw/element/types'

export interface ImageCacheEntry {
  image: HTMLImageElement
  mimeType: string
}

export function isImageElement(
  el: ExcalidrawElement | null,
): el is ExcalidrawImageElement {
  return el !== null && el.type === 'image'
}

export function isInitializedImageElement(
  el: ExcalidrawElement | null,
): el is InitializedExcalidrawImageElement {
  return isImageElement(el) && el.fileId !== null
}
