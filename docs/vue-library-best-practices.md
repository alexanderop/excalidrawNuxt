# Vue 3 Component Library Best Practices (2025-2026)

This document captures best practices for creating a Vue 3 component library that works in both Vue and Nuxt applications, with a focus on canvas-based drawing libraries like our Excalidraw implementation.

## 1. Build Tooling

### Recommended Tools

**unbuild** (recommended for simplicity)

- Part of the UnJS ecosystem
- Built on Rollup with mkdist integration
- Handles `.vue` files out-of-the-box
- Provides bundleless builds (file-to-file transpilation)
- Maintains source directory structure in output

**tsup** (alternative for dual format builds)

- Easy to use: `--format cjs,esm`
- Excellent for dual ESM/CJS packages
- Generates proper type definitions for both formats

**Vite Library Mode** (another option)

- Works well with Vue projects
- Excludes Vue from bundle by default in lib mode
- Requires additional plugins for CSS injection

### unbuild Configuration Example

```typescript
// build.config.ts
import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  entries: ["./src/"], // Directory ending in / uses mkdist (bundleless)
  declaration: true, // Generate .d.ts files
  clean: true,
  rollup: {
    emitCJS: true, // Generate CJS alongside ESM
  },
});
```

**Key Benefits:**

- Directory structure mirrors source (e.g., `src/` → `dist/`)
- Vue components remain usable in dist folder
- Bundleless approach delivers code "as native as possible"
- Let userland tools handle transpiling and optimization

### tsup Configuration Example

```typescript
// tsup.config.ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true, // Generate .d.ts files
  splitting: false,
  sourcemap: true,
  clean: true,
});
```

## 2. Package.json Exports

### Modern Exports Field Structure

```json
{
  "name": "@excalidraw-nuxt/core",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./components/*": {
      "types": "./dist/components/*.d.ts",
      "import": "./dist/components/*.js",
      "require": "./dist/components/*.cjs"
    },
    "./composables": {
      "types": "./dist/composables/index.d.ts",
      "import": "./dist/composables/index.js",
      "require": "./dist/composables/index.cjs"
    }
  },
  "files": ["dist"]
}
```

**Key Points:**

- Conditional exports for `require` (CJS) and `import` (ESM)
- `types` condition always comes first
- TypeScript always matches `types` and `default` conditions
- Multiple entry points for better tree-shaking

### TypeScript Type Resolution

Use `typesVersions` for advanced type resolution:

```json
{
  "typesVersions": {
    "*": {
      "*": ["./dist/index.d.ts", "./dist/*"]
    }
  }
}
```

**Benefits:**

- Redirects TypeScript resolution without messy type files in package root
- Supports different TS compiler versions
- Works with conditional exports

## 3. Nuxt Module Integration

### Creating a Nuxt Module Wrapper

Users should be able to add your library to `nuxt.config.ts` with minimal setup:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["@excalidraw-nuxt/module"],
});
```

### Module Implementation

```typescript
// src/module.ts
import { defineNuxtModule, addComponentsDir, createResolver } from "@nuxt/kit";

export default defineNuxtModule({
  meta: {
    name: "@excalidraw-nuxt/module",
    configKey: "excalidraw",
    compatibility: {
      nuxt: "^4.0.0",
    },
  },
  defaults: {
    // Default configuration
    prefix: "",
    global: true,
  },
  async setup(options, nuxt) {
    const resolver = createResolver(import.meta.url);

    // Register components directory
    await addComponentsDir({
      path: resolver.resolve("./runtime/components"),
      pathPrefix: false,
      prefix: options.prefix,
      global: options.global,
    });

    // Add composables (auto-imports)
    addImports([
      {
        name: "useExcalidraw",
        from: resolver.resolve("./runtime/composables/useExcalidraw"),
      },
    ]);

    // Add plugin if needed
    addPlugin(resolver.resolve("./runtime/plugin"));
  },
});
```

**Key Features:**

- `addComponentsDir`: Auto-imports components (tree-shakeable)
- `addImports`: Auto-imports composables
- `addPlugin`: Injects setup code
- Minimal consumer setup required

### Package Structure for Nuxt Module

```
packages/
├── core/                    # Vue 3 library (framework-agnostic)
│   ├── src/
│   ├── package.json
│   └── build.config.ts
└── nuxt-module/             # Nuxt wrapper module
    ├── src/
    │   ├── module.ts
    │   └── runtime/
    │       ├── components/
    │       ├── composables/
    │       └── plugin.ts
    ├── package.json
    └── build.config.ts
```

## 4. Tree-Shaking

### Ensuring Tree-Shakeable Builds

**Use ESM Format:**

- Tree-shaking only works with ESM
- Favor `lodash-es` over `lodash`
- Use `type: "module"` in package.json

**Export Named Functions:**

```typescript
// ✅ Good - tree-shakeable
export { useCanvas } from "./composables/useCanvas";
export { useSelection } from "./composables/useSelection";
export { CanvasContainer } from "./components/CanvasContainer.vue";

// ❌ Bad - not tree-shakeable
export default {
  useCanvas,
  useSelection,
  CanvasContainer,
};
```

**Vue 3 Global API:**

- Vue 3 APIs must be imported as named exports
- Global APIs not used will be eliminated from bundle
- Example: `import { ref, computed } from 'vue'`

**Component Registration:**
When using Nuxt's `addComponentsDir`, components are automatically tree-shakeable:

- Only imported components are bundled
- No manual registration needed
- Full TypeScript support

## 5. CSS Handling

### Challenge

When building a library with Vite, CSS gets extracted to separate files. Consumers need to either:

1. Manually import CSS alongside components
2. Use automatic CSS injection

### Solution 1: Manual Imports (Simple)

```typescript
// Consumer code
import { CanvasContainer } from "@excalidraw-nuxt/core";
import "@excalidraw-nuxt/core/dist/style.css";
```

**Package.json:**

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./dist/style.css": "./dist/style.css"
  }
}
```

### Solution 2: Automatic CSS Injection (vite-plugin-lib-inject-css)

```typescript
// vite.config.ts
import { libInjectCss } from "vite-plugin-lib-inject-css";

export default defineConfig({
  plugins: [vue(), libInjectCss()],
  build: {
    lib: {
      entry: {
        index: "src/index.ts",
        button: "src/components/Button.vue",
        canvas: "src/components/Canvas.vue",
      },
      formats: ["es"],
    },
  },
});
```

**Result:**

```javascript
// dist/canvas.js
import "./canvas.css"; // Injected automatically
export { Canvas };
```

**Benefits:**

- Consumers don't need separate CSS imports
- Works with named imports
- Tree-shaking friendly (only used component styles)

### Solution 3: CSS-in-JS (Custom Elements)

For shadow DOM components (custom elements):

```typescript
// Component inlines styles in shadow root
defineCustomElement({
  // Styles are automatically injected into shadow DOM
  styles: [`/* component styles */`],
});
```

### Best Practices for Component Library Styles

**Use Class-Based Styling:**

```vue
<!-- ✅ Good - overrideable, low specificity -->
<template>
  <div class="excalidraw-canvas">
    <div class="excalidraw-canvas__toolbar">...</div>
  </div>
</template>

<style>
.excalidraw-canvas {
  /* ... */
}
.excalidraw-canvas__toolbar {
  /* ... */
}
</style>
```

**Avoid Scoped Styles in Libraries:**

```vue
<!-- ❌ Bad - harder to override -->
<style scoped>
div {
  /* ... */
}
</style>
```

**Rationale:**

- Makes overriding internal styles easier
- Human-readable class names
- Lower specificity (easier to override)
- No conflicts with consumer code (use unique prefixes)

## 6. TypeScript Type Exports

### Export All Types

```typescript
// src/types/index.ts
export type {
  Element,
  ExcalidrawElement,
  CanvasElement,
  ArrowElement,
  TextElement,
} from "./elements";

export type { AppState, ViewportState, CanvasState } from "./state";
```

### Package.json Types Configuration

```json
{
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./types": {
      "types": "./dist/types/index.d.ts"
    }
  }
}
```

### Generate Declaration Files

**With unbuild:**

```typescript
export default defineBuildConfig({
  declaration: true, // Generates .d.ts
});
```

**With tsup:**

```typescript
export default defineConfig({
  dts: true, // Generates .d.ts and .d.cts
});
```

## 7. Composable Exports (Shared State/Context)

### Challenge

Composables with shared state need special handling:

- Same instance across app (singleton pattern)
- Provide/inject for component trees
- SSR-safe (no cross-request pollution)

### Pattern 1: VueUse's createInjectionState

**Best for component-tree scoped state:**

```typescript
// composables/useExcalidraw.ts
import { createInjectionState } from "@vueuse/core";
import { ref, computed } from "vue";

const [useProvideExcalidraw, useInjectExcalidraw] = createInjectionState((initialConfig) => {
  const elements = ref([]);
  const appState = ref({});

  const selectedElements = computed(() =>
    elements.value.filter((el) => appState.value.selectedElementIds?.has(el.id)),
  );

  const addElement = (element) => {
    elements.value.push(element);
  };

  return {
    elements,
    appState,
    selectedElements,
    addElement,
  };
});

export { useProvideExcalidraw, useInjectExcalidraw };
```

**Usage:**

```vue
<!-- App.vue (provider) -->
<script setup>
import { useProvideExcalidraw } from "@excalidraw-nuxt/core";

useProvideExcalidraw({ theme: "dark" });
</script>

<!-- CanvasComponent.vue (consumer) -->
<script setup>
import { useInjectExcalidraw } from "@excalidraw-nuxt/core";

const { elements, addElement } = useInjectExcalidraw();
</script>
```

**Benefits:**

- Type-safe
- Scoped to component tree
- No global pollution
- SSR-safe (each request gets own instance)

### Pattern 2: createSharedComposable (Global Singleton)

**Best for truly global state:**

```typescript
import { createSharedComposable } from "@vueuse/core";
import { ref } from "vue";

const useExcalidrawGlobal = createSharedComposable(() => {
  const theme = ref("light");
  const setTheme = (newTheme) => {
    theme.value = newTheme;
  };

  return { theme, setTheme };
});

export { useExcalidrawGlobal };
```

**SSR Handling:**

- Automatically falls back to non-shared in SSR
- Prevents cross-request pollution
- Each SSR request gets fresh instance

### Pattern 3: Factory Pattern (Vuetify-style)

**Best for library initialization with config:**

```typescript
// createExcalidraw.ts
import { provide, inject, App } from "vue";
import type { ExcalidrawConfig } from "./types";

const ExcalidrawSymbol = Symbol("excalidraw");

export function createExcalidraw(config: ExcalidrawConfig = {}) {
  const excalidraw = {
    config,
    // Library state and methods
    install(app: App) {
      app.provide(ExcalidrawSymbol, excalidraw);
    },
  };

  return excalidraw;
}

export function useExcalidraw() {
  const excalidraw = inject(ExcalidrawSymbol);
  if (!excalidraw) {
    throw new Error("useExcalidraw must be used within createExcalidraw");
  }
  return excalidraw;
}
```

**Usage:**

```typescript
// main.ts
import { createApp } from "vue";
import { createExcalidraw } from "@excalidraw-nuxt/core";

const app = createApp(App);
const excalidraw = createExcalidraw({
  theme: "dark",
  gridSize: 20,
});

app.use(excalidraw);
app.mount("#app");
```

### Choosing the Right Pattern

| Pattern                      | Use Case               | SSR-Safe | Scope  |
| ---------------------------- | ---------------------- | -------- | ------ |
| `createInjectionState`       | Component tree state   | ✅       | Tree   |
| `createSharedComposable`     | Global app state       | ✅       | Global |
| Factory (`createExcalidraw`) | Library initialization | ✅       | App    |

## 8. Real-World Examples

### VueUse (Composable Library)

**Architecture:**

- Monorepo with multiple packages
- Each composable is self-contained
- `createInjectionState` and `createSharedComposable` for state
- Tree-shakeable exports
- Excellent TypeScript support

**Key Patterns:**

- Bundleless build (preserves directory structure)
- ESM-first with CJS fallback
- SSR-safe composables
- Automatic type generation

### Vue Flow (Canvas-Based Editor)

**Architecture:**

- Hub-and-spoke monorepo (pnpm + Turborepo)
- `@vue-flow/core` as central package
- Plugins declare core as peer dependency
- Uses provide/inject for state sharing

**Key Patterns:**

- `VueFlowStore` with reactive state
- `useVueFlow()` composable for state access
- Actions interface for mutations
- Component-based API

### TresJS (Three.js for Vue)

**Architecture:**

- Custom Vue 3 renderer
- Components transform to Three.js objects
- Leverages Vue reactivity for 3D updates

**Key Patterns:**

- Component-driven 3D development
- Live data binding with Vue reactivity
- Scoped state via provide/inject
- Plugin ecosystem

### Vuetify / PrimeVue (UI Libraries)

**Architecture:**

- Factory pattern: `createVuetify()` / `createPrimeVue()`
- Component auto-registration
- Theme system via provide/inject

**Setup Example:**

```typescript
import { createVuetify } from "vuetify";

const vuetify = createVuetify({
  theme: {
    defaultTheme: "dark",
  },
});

app.use(vuetify);
```

## 9. Recommended Architecture for Excalidraw Nuxt

Based on the research, here's the recommended structure:

### Monorepo Structure

```
packages/
├── core/                           # @excalidraw-nuxt/core
│   ├── src/
│   │   ├── components/            # Vue components
│   │   ├── composables/           # Composables with state
│   │   ├── features/              # Domain features
│   │   ├── shared/                # Shared utilities
│   │   ├── types/                 # TypeScript types
│   │   └── index.ts               # Main entry
│   ├── package.json
│   └── build.config.ts            # unbuild config
│
└── nuxt-module/                    # @excalidraw-nuxt/module
    ├── src/
    │   ├── module.ts              # Nuxt module definition
    │   └── runtime/
    │       ├── plugin.ts          # Auto-initialization
    │       └── composables/       # Nuxt-specific composables
    ├── package.json
    └── build.config.ts

# Root configuration
├── pnpm-workspace.yaml
└── package.json
```

### Core Package Configuration

```typescript
// packages/core/build.config.ts
import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  entries: [
    "./src/index", // Main entry
    "./src/components/index", // Components entry
    "./src/composables/index", // Composables entry
  ],
  declaration: true,
  clean: true,
  rollup: {
    emitCJS: true,
  },
});
```

```json
// packages/core/package.json
{
  "name": "@excalidraw-nuxt/core",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    },
    "./components": {
      "types": "./dist/components/index.d.ts",
      "import": "./dist/components/index.mjs"
    },
    "./composables": {
      "types": "./dist/composables/index.d.ts",
      "import": "./dist/composables/index.mjs"
    }
  },
  "peerDependencies": {
    "vue": "^3.5.0"
  }
}
```

### State Management Pattern

Use `createInjectionState` for canvas state:

```typescript
// packages/core/src/composables/useExcalidraw.ts
import { createInjectionState } from "@vueuse/core";
import { ref, computed } from "vue";

const [useProvideExcalidraw, useInjectExcalidraw] = createInjectionState((config = {}) => {
  // Import all the existing composables
  const { elements } = useElements();
  const { appState } = useAppState();
  const { viewport } = useViewport();
  const { selectedElements } = useSelection();

  return {
    elements,
    appState,
    viewport,
    selectedElements,
    // ... all other state and actions
  };
});

export { useProvideExcalidraw, useInjectExcalidraw };
```

### Nuxt Module Setup

```typescript
// packages/nuxt-module/src/module.ts
import { defineNuxtModule, addComponentsDir, createResolver } from "@nuxt/kit";

export default defineNuxtModule({
  meta: {
    name: "@excalidraw-nuxt/module",
    configKey: "excalidraw",
  },
  async setup(options, nuxt) {
    const resolver = createResolver(import.meta.url);

    // Auto-import @excalidraw-nuxt/core components
    await addComponentsDir({
      path: resolver.resolve("@excalidraw-nuxt/core/components"),
      global: true,
    });

    // Auto-import composables
    addImports([
      {
        name: "useProvideExcalidraw",
        from: "@excalidraw-nuxt/core/composables",
      },
      {
        name: "useInjectExcalidraw",
        from: "@excalidraw-nuxt/core/composables",
      },
    ]);
  },
});
```

## 10. Migration Path

### Phase 1: Extract Core Package

1. Move framework-agnostic code to `packages/core`
2. Set up unbuild configuration
3. Configure package.json exports
4. Ensure all imports are explicit (no auto-imports in core)

### Phase 2: Create Nuxt Module

1. Create `packages/nuxt-module`
2. Implement module with `defineNuxtModule`
3. Use `addComponentsDir` for component auto-imports
4. Configure auto-imports for composables

### Phase 3: Refactor State Management

1. Wrap existing composables with `createInjectionState`
2. Update components to use `useInjectExcalidraw()`
3. Add provider in root component/layout

### Phase 4: CSS Strategy

1. Choose between manual imports or vite-plugin-lib-inject-css
2. Configure build accordingly
3. Update documentation

## 11. Testing the Library

### In Monorepo (Development)

```json
// pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'playground'
```

```json
// playground/package.json
{
  "dependencies": {
    "@excalidraw-nuxt/core": "workspace:*",
    "@excalidraw-nuxt/module": "workspace:*"
  }
}
```

### As Published Package

```bash
# Build and pack locally
cd packages/core
pnpm build
pnpm pack

# Test in another project
cd /path/to/test-project
pnpm add /path/to/excalidraw-nuxt-core-1.0.0.tgz
```

### Verify Package Quality

Use [publint.dev](https://publint.dev) to verify:

- Proper exports configuration
- Type definitions
- ESM/CJS dual package setup
- Tree-shaking compatibility

## Sources

### Build Tooling

- [The Simplest Method to Create a Vue.js Component Library](https://soubiran.dev/posts/the-simplest-method-to-create-a-vue-js-component-library)
- [Building a Vue 3 component library - LogRocket Blog](https://blog.logrocket.com/building-vue-3-component-library/)
- [Ship ESM & CJS in one Package](https://antfu.me/posts/publish-esm-and-cjs)
- [Dual Publishing ESM and CJS Modules with tsup](https://johnnyreilly.com/dual-publishing-esm-cjs-modules-with-tsup-and-are-the-types-wrong)

### Package.json Exports & Types

- [Types for Submodules](https://antfu.me/posts/types-for-sub-modules)
- [TypeScript Modules Reference](https://www.typescriptlang.org/docs/handbook/modules/reference.html)

### Nuxt Module Development

- [Integrate Your Component Library as a Nuxt Module](https://vueschool.io/lessons/integrate-your-component-library-as-a-nuxt-module)
- [Enhancing Integration with Unplugin and Nuxt Module](https://soubiran.dev/series/the-complete-guide-to-building-a-vue-js-component-library/enhancing-integration-with-unplugin-and-nuxt-module)
- [Add Plugins, Components & More - Nuxt Modules](https://nuxt.com/docs/4.x/guide/modules/recipes-basics)

### Tree-Shaking

- [Tree-Shaking: A Reference Guide](https://www.smashingmagazine.com/2021/05/tree-shaking-reference-guide/)
- [Global API Treeshaking - Vue 3 Migration Guide](https://v3-migration.vuejs.org/breaking-changes/global-api-treeshaking.html)

### CSS Handling

- [vite-plugin-lib-inject-css](https://www.npmjs.com/package/vite-plugin-lib-inject-css)
- [Vue.js Style Guide](https://v3.vuejs.org/style-guide/)

### Composable Architecture

- [createInjectionState - VueUse](https://vueuse.org/shared/createinjectionstate/)
- [createSharedComposable - VueUse](https://vueuse.org/shared/createsharedcomposable/)
- [Managing State with the Composable Provider Pattern](https://technology.doximity.com/articles/managing-state-in-vue-applications-the-composable-provider-pattern)
- [How VueUse encapsulates Provide/Inject](https://medium.com/@mbhexp/how-does-vueuse-encapsulate-vue3-provide-inject-94f5ca467a94)

### Real-World Examples

- [Vue Flow - Customizable Vue3 Flowchart Library](https://vueflow.dev/)
- [TresJS - Three.js for Vue](https://tresjs.org/)
- [Building a 3D Scene in Nuxt with TresJS](https://www.vuemastery.com/blog/building-a-3d-scene-in-nuxt-with-tresjs/)

### Monorepo Architecture

- [Scalable Nuxt 3 Monorepos with PNPM Workspaces](https://vueschool.io/articles/vuejs-tutorials/scalable-nuxt-3-monorepos-with-pnpm-workspaces/)
- [Building a Modular Monolith with Nuxt Layers](https://alexop.dev/posts/nuxt-layers-modular-monolith/)
