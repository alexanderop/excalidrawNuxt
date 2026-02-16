import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [vue()],
  test: {
    name: "unit",
    include: ["app/**/*.unit.test.ts"],
    environment: "node",
    globals: true,
    server: {
      deps: {
        inline: [/@excalidraw\//],
      },
    },
  },
  resolve: {
    alias: {
      "~": fileURLToPath(new URL("app", import.meta.url)),
      "@excalidraw/math/ellipse": "@excalidraw/math",
    },
  },
});
