import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  optimizeDeps: {
    esbuildOptions: {
      alias: {
        "@excalidraw/math/ellipse": "@excalidraw/math",
      },
    },
  },
  resolve: {
    alias: {
      "~": fileURLToPath(new URL("app", import.meta.url)),
      "@excalidraw/math/ellipse": "@excalidraw/math",
    },
  },
  test: {
    globals: true,
    projects: [
      "vitest.config.unit.ts",
      "vitest.config.browser.ts",
      "packages/core/vitest.config.ts",
    ],
  },
});
