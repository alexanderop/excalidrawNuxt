import { defineConfig } from "vitest/config";

export default defineConfig({
  optimizeDeps: {
    esbuildOptions: {
      alias: {
        "@excalidraw/math/ellipse": "@excalidraw/math",
      },
    },
  },
  test: {
    name: "core",
    include: ["src/**/*.unit.test.ts"],
    environment: "node",
    globals: true,
    setupFiles: ["src/__test-utils__/setup-node.ts"],
  },
  resolve: {
    alias: {
      "@excalidraw/math/ellipse": "@excalidraw/math",
    },
  },
});
