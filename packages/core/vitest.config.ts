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
    server: {
      deps: {
        inline: [/@excalidraw\//],
      },
    },
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["**/*.test.ts", "**/__test-utils__/**", "**/types.ts", "**/index.ts"],
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "./coverage",
      reportOnFailure: true,
    },
  },
  resolve: {
    alias: {
      "@excalidraw/math/ellipse": "@excalidraw/math",
    },
  },
});
