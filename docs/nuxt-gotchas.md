# Nuxt 4 Gotchas

> **This file is agent memory.** Update it when you discover new pitfalls. Use Mermaid for complex explanations.

## Nuxt 4 Directory Structure

```mermaid
graph TD
    subgraph "✅ Nuxt 4"
        A1[app/] --> B1[pages/]
        A1 --> C1[components/]
        A1 --> D1[composables/]
        A1 --> E1[layouts/]
    end

    subgraph "❌ Nuxt 3 (don't use)"
        A2[project root] --> B2[pages/]
        A2 --> C2[components/]
    end
```

Everything lives under `app/`. Don't put pages, components, or composables at the project root.

## Auto-Imports: Don't Manually Import Vue/Nuxt APIs

Nuxt auto-imports `ref`, `computed`, `useState`, `useRoute`, `useFetch`, `definePageMeta`, and all other Vue/Nuxt composables. Adding manual imports creates duplicate declarations.

```ts
// ❌ Unnecessary
import { ref, computed } from 'vue'

// ✅ Just use them
const count = ref(0)
```

## `compatibilityDate` Is Required in Nuxt 4

The `nuxt.config.ts` must include `compatibilityDate`. This locks behavior to a specific date so Nuxt can introduce breaking changes in minor versions without affecting existing projects.

## Client-Only Components: Use `.client.vue` Suffix

```mermaid
flowchart LR
    A[Component.vue] -->|SSR + Client| B[Renders everywhere]
    C[Component.client.vue] -->|Client only| D[Skipped during SSR]
```

Components that need browser APIs (canvas, window, document) use the `.client.vue` convention.

## `useHead` Replaces Manual `<head>` Tags

Don't add `<meta>` or `<link>` tags directly. Use `useHead()` or `useSeoMeta()` composables.

## Dev Server Port Conflicts

Default port is 3000. If another service uses it, Nuxt will auto-increment. Check terminal output for actual port.
