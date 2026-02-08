import { RoughGenerator } from 'roughjs/bin/generator'
import type { Drawable, Options } from 'roughjs/bin/core'
import type { ExcalidrawElement } from '~/features/elements/types'
import type { Theme } from '~/features/theme/types'
import { resolveColor } from '~/features/theme/colors'

const generator = new RoughGenerator()

interface CacheEntry {
  nonce: number
  theme: Theme
  drawable: Drawable
}

const shapeCache = new Map<string, CacheEntry>()

export function clearShapeCache(): void {
  shapeCache.clear()
}

function elementToRoughOptions(element: ExcalidrawElement, theme: Theme): Options {
  const options: Options = {
    seed: element.seed,
    roughness: element.roughness,
    stroke: resolveColor(element.strokeColor, theme),
    strokeWidth: element.strokeWidth,
    fillStyle: element.fillStyle,
  }

  if (element.backgroundColor !== 'transparent') {
    options.fill = resolveColor(element.backgroundColor, theme)
  }

  return options
}

function generateDrawable(element: ExcalidrawElement, theme: Theme): Drawable {
  if (element.type === 'text') {
    throw new Error('Text elements should not use RoughJS shape generation')
  }

  const { width, height } = element
  const options = elementToRoughOptions(element, theme)

  if (element.type === 'arrow') {
    const { points } = element
    const pts = points.map(p => [p[0], p[1]] satisfies [number, number])
    return generator.linearPath(pts, options)
  }

  if (element.type === 'rectangle') {
    return generator.rectangle(0, 0, width, height, options)
  }

  if (element.type === 'ellipse') {
    return generator.ellipse(width / 2, height / 2, width, height, options)
  }

  if (element.type === 'diamond') {
    return generator.polygon(
      [
        [width / 2, 0],
        [width, height / 2],
        [width / 2, height],
        [0, height / 2],
      ],
      options,
    )
  }

  throw new Error(`Unhandled element type: ${(element as { type: string }).type}`)
}

export function pruneShapeCache(elements: readonly ExcalidrawElement[]): void {
  const activeIds = new Set(
    elements.filter(el => !el.isDeleted).map(el => el.id),
  )
  for (const key of shapeCache.keys()) {
    if (!activeIds.has(key)) {
      shapeCache.delete(key)
    }
  }
}

export function generateShape(element: ExcalidrawElement, theme: Theme): Drawable {
  const cached = shapeCache.get(element.id)
  if (cached && cached.nonce === element.versionNonce && cached.theme === theme) {
    return cached.drawable
  }

  const drawable = generateDrawable(element, theme)
  shapeCache.set(element.id, { nonce: element.versionNonce, theme, drawable })
  return drawable
}
