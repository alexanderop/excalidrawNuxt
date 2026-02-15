# Install Nuxt UI 4 and configure module

**Points:** 3
**Phase:** 0 - Foundation
**Priority:** Critical (blocker for all other tickets)

## Description

Install Nuxt UI 4 and wire it into the Nuxt config.

## Tasks

- `pnpm add @nuxt/ui`
- `pnpm remove @tailwindcss/vite`
- Remove `import tailwindcss from '@tailwindcss/vite'` and `tailwindcss()` from vite plugins in `nuxt.config.ts`
- Add `'@nuxt/ui'` to `modules` in `nuxt.config.ts`
- Add `@import "@nuxt/ui";` after `@import "tailwindcss"` in `app/assets/css/main.css`
- Wrap app root with `<UApp>` in `app/app.vue`
- Verify existing Tailwind utilities and custom `@theme` colors still work

## Acceptance Criteria

- `pnpm dev` starts without errors
- Existing UI renders correctly
- `<UButton>` renders when placed in any component
