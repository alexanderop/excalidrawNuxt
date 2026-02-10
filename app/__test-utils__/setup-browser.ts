import { expect, beforeAll } from 'vitest'
import { page } from 'vitest/browser'
import '~/assets/css/main.css'

// Desktop-sized viewport for all browser tests (screenshots are resolution-dependent)
beforeAll(async () => {
  await page.viewport(1280, 800)
})

// vitest-browser-vue mounts components into a <div> under <body>.
// main.css sizes html/body/#__nuxt to 100%, but there is no #__nuxt in tests
// and Tailwind v4 processing may reorder the rules. We explicitly ensure the
// full height/width chain so useElementSize returns the viewport dimensions
// and the canvas renderer can bootstrap properly.
const style = document.createElement('style')
style.textContent = [
  'html, body { height: 100%; width: 100%; margin: 0; padding: 0; overflow: hidden; }',
  'body > div { height: 100%; width: 100%; }',
].join('\n')
document.head.append(style)

// Float snapshot serializer — prevents float precision flakiness in snapshots.
// Non-integer numbers are rounded to 5 decimal places.
expect.addSnapshotSerializer({
  serialize(val: number, _config, _indentation, _depth, _refs, _printer) {
    return val.toFixed(5)
  },
  test(val: unknown) {
    return typeof val === 'number' && Number.isFinite(val) && !Number.isInteger(val)
  },
})
