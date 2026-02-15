import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { playwright } from "@vitest/browser-playwright";
import { canvasDrag } from "./app/__test-utils__/commands/canvasDrag";
import { canvasClick } from "./app/__test-utils__/commands/canvasClick";
import { canvasDblClick } from "./app/__test-utils__/commands/canvasDblClick";
import { showGridOverlay } from "./app/__test-utils__/commands/showGridOverlay";

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  optimizeDeps: {
    include: ["@excalidraw/common"],
    exclude: ["@excalidraw/math", "@excalidraw/element"],
    esbuildOptions: {
      conditions: ["development"],
      alias: {
        "@excalidraw/math/ellipse": "@excalidraw/math",
      },
    },
  },
  test: {
    name: "browser",
    include: ["app/**/*.browser.test.ts"],
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: "chromium" }],
      commands: { canvasDrag, canvasClick, canvasDblClick, showGridOverlay },
    },
    globals: true,
    setupFiles: ["app/__test-utils__/setup-browser.ts"],
  },
  resolve: {
    conditions: ["development"],
    dedupe: ["vue", "@vue/runtime-core", "@vue/runtime-dom", "@vue/reactivity", "@vue/shared"],
    alias: {
      "~": fileURLToPath(new URL("app", import.meta.url)),
      "@excalidraw/math/ellipse": "@excalidraw/math",
      // Force all @vue/shared imports to ESM build — prevents CJS/ESM split
      // that causes duplicate EMPTY_OBJ between vitest-browser-vue and vue
      "@vue/shared": fileURLToPath(
        new URL("node_modules/@vue/shared/dist/shared.esm-bundler.js", import.meta.url),
      ),
      "@vue/runtime-core": fileURLToPath(
        new URL("node_modules/@vue/runtime-core/dist/runtime-core.esm-bundler.js", import.meta.url),
      ),
      "@vue/runtime-dom": fileURLToPath(
        new URL("node_modules/@vue/runtime-dom/dist/runtime-dom.esm-bundler.js", import.meta.url),
      ),
      "@vue/reactivity": fileURLToPath(
        new URL("node_modules/@vue/reactivity/dist/reactivity.esm-bundler.js", import.meta.url),
      ),
    },
  },
});
