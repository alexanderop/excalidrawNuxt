import { defineConfig } from 'vitest/config'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [tailwindcss()],
  test: {
    name: 'browser',
    include: ['app/**/*.browser.test.ts'],
    browser: {
      enabled: true,
      provider: 'playwright',
      instances: [{ browser: 'chromium' }],
    },
    globals: true,
  },
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('app', import.meta.url)),
    },
  },
})
