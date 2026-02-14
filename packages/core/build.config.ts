import { defineBuildConfig } from "unbuild";
import vue from "@vitejs/plugin-vue";

export default defineBuildConfig({
  entries: ["src/index"],
  declaration: true,
  clean: true,
  externals: ["vue", "@vueuse/core"],
  rollup: {
    emitCJS: false,
  },
  hooks: {
    "rollup:options"(_ctx, options) {
      if (Array.isArray(options.plugins)) {
        options.plugins.unshift(vue());
      }
    },
  },
});
