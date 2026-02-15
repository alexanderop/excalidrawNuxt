import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { playwright } from "@vitest/browser-playwright";
import { canvasDrag } from "./app/__test-utils__/commands/canvasDrag";
import { canvasClick } from "./app/__test-utils__/commands/canvasClick";
import { canvasDblClick } from "./app/__test-utils__/commands/canvasDblClick";
import { showGridOverlay } from "./app/__test-utils__/commands/showGridOverlay";

const require = createRequire(import.meta.url);

/**
 * Force all @vue/* packages to their ESM builds.
 * Without this, vitest browser mode's dep optimizer can mix CJS and ESM copies
 * of Vue internals, causing "Cannot define property, object is not extensible"
 * errors (the EMPTY_OBJ duplication bug).
 */
const vueEsmAliases: Record<string, string> = Object.fromEntries(
  ["@vue/runtime-core", "@vue/runtime-dom", "@vue/reactivity", "@vue/shared"].map((pkg) => [
    pkg,
    require.resolve(`${pkg}/dist/${pkg.split("/")[1]}.esm-bundler.js`),
  ]),
);

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
      ...vueEsmAliases,
    },
  },
});
