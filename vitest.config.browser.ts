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
    esbuildOptions: {
      conditions: ["development"],
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
    alias: {
      "~": fileURLToPath(new URL("app", import.meta.url)),
    },
  },
});
