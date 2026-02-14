import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    name: "unit",
    include: ["app/**/*.unit.test.ts"],
    environment: "node",
    globals: true,
  },
  resolve: {
    alias: {
      "~": fileURLToPath(new URL("app", import.meta.url)),
    },
  },
});
