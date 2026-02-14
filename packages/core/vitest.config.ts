import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "core",
    include: ["src/**/*.unit.test.ts"],
    environment: "node",
    globals: true,
  },
  resolve: {
    alias: {
      "@excalidraw/math/ellipse": "@excalidraw/math",
    },
  },
});
