import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: false,

  imports: { autoImport: false },

  typescript: {
    tsConfig: {
      exclude: ['../app/**/*.test.ts', '../app/__test-utils__/**/*'],
    },
  },

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        // @excalidraw/math only exposes "./*" subpaths for types, not runtime JS.
        // @excalidraw/element imports "@excalidraw/math/ellipse" at runtime,
        // which the bundler can't resolve. The main entry re-exports everything,
        // so we alias the subpath to the main package.
        '@excalidraw/math/ellipse': '@excalidraw/math',
      },
    },
  },
})
