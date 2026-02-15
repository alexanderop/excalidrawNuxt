import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import path from "node:path";
import { playwright } from "@vitest/browser-playwright";
import { canvasDrag } from "./app/__test-utils__/commands/canvasDrag";
import { canvasClick } from "./app/__test-utils__/commands/canvasClick";
import { canvasDblClick } from "./app/__test-utils__/commands/canvasDblClick";
import { showGridOverlay } from "./app/__test-utils__/commands/showGridOverlay";

// Resolve @vue/* sub-packages from vue's own location, not from project root.
// Bun isolated installs don't hoist transitive deps, so @vue/shared etc.
// may only be resolvable from within vue's node_modules scope.
const rootRequire = createRequire(path.resolve(process.cwd(), "package.json"));
const vueDir = path.dirname(rootRequire.resolve("vue/package.json"));
const vueRequire = createRequire(path.join(vueDir, "package.json"));

function resolveVueEsm(pkg: string): string {
  const pkgJson = vueRequire.resolve(`${pkg}/package.json`);
  const name = pkg.split("/")[1]!;
  return path.join(path.dirname(pkgJson), "dist", `${name}.esm-bundler.js`);
}

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
      // Force all @vue/* imports to ESM build — prevents CJS/ESM split
      // that causes duplicate EMPTY_OBJ between vitest-browser-vue and vue.
      // Uses require.resolve for cross-platform node_modules resolution.
      "@vue/shared": resolveVueEsm("@vue/shared"),
      "@vue/runtime-core": resolveVueEsm("@vue/runtime-core"),
      "@vue/runtime-dom": resolveVueEsm("@vue/runtime-dom"),
      "@vue/reactivity": resolveVueEsm("@vue/reactivity"),
    },
  },
});
