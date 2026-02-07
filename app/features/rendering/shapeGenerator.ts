import { RoughGenerator } from 'roughjs/bin/generator'
import type { Drawable, Options } from 'roughjs/bin/core'
import type { ExcalidrawElement } from '~/features/elements/types'

const generator = new RoughGenerator()

interface CacheEntry {
  nonce: number
  drawable: Drawable
}

const shapeCache = new Map<string, CacheEntry>()

export function clearShapeCache(): void {
  shapeCache.clear()
}

function elementToRoughOptions(element: ExcalidrawElement): Options {
  const options: Options = {
    seed: element.seed,
    roughness: element.roughness,
    stroke: element.strokeColor,
    strokeWidth: element.strokeWidth,
    fillStyle: element.fillStyle,
  }

  if (element.backgroundColor !== 'transparent') {
    options.fill = element.backgroundColor
  }

  return options
}

function generateDrawable(element: ExcalidrawElement): Drawable {
  const { width, height } = element
  const options = elementToRoughOptions(element)

  if (element.type === 'rectangle') {
    return generator.rectangle(0, 0, width, height, options)
  }

  if (element.type === 'ellipse') {
    return generator.ellipse(width / 2, height / 2, width, height, options)
  }

  // diamond
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

export function generateShape(element: ExcalidrawElement): Drawable {
  const cached = shapeCache.get(element.id)
  if (cached && cached.nonce === element.versionNonce) {
    return cached.drawable
  }

  const drawable = generateDrawable(element)
  shapeCache.set(element.id, { nonce: element.versionNonce, drawable })
  return drawable
}
