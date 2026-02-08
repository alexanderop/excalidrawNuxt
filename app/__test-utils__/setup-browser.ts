import '~/assets/css/main.css'

// vitest-browser-vue mounts components into a <div> under <body>.
// main.css sizes html/body/#__nuxt to 100%, but there is no #__nuxt in tests.
// Without this, CanvasContainer's h-full/w-full resolves to 0px, so
// useElementSize returns 0/0 and the renderer never paints.
const style = document.createElement('style')
style.textContent = 'body > div { height: 100%; width: 100%; }'
document.head.append(style)
