# CLAUDE.md

Excalidraw Nuxt is a collaborative drawing app built with Nuxt 4 and Excalidraw.

## Commands

```
bun dev           # Start dev server
bun build         # Production build
bun preview       # Preview production build
```

## Stack

- Nuxt 4 (Vue 3.5+)
- Excalidraw (via @excalidraw/excalidraw)
- Tailwind CSS v4 (via `@tailwindcss/vite`, not the Nuxt module)
- TypeScript

## Colors

Defined in `app/assets/css/main.css` via `@theme`. Use these as Tailwind utilities:

- `base` — `rgb(33,39,55)` dark navy background
- `foreground` — `rgb(234,237,243)` light gray text
- `accent` — `rgb(255,107,237)` hot pink highlights
- `surface` — `rgb(52,63,96)` cards/panels
- `muted` — `rgb(138,51,123)` subdued purple
- `edge` — `rgb(171,75,153)` borders/dividers

## Structure

- `app/` - Vue application (pages, components, composables)
- `public/` - Static assets
- `nuxt.config.ts` - Nuxt configuration
- `docs/` - Agent memory (gotchas, patterns, architecture)

## Docs = Memory

**Do NOT use Claude Code's built-in memory (`~/.claude/projects/.../memory/`).** The `docs/` folder IS the agent memory. It is version-controlled, shared across sessions, and agents maintain it themselves.

**After completing any task**, update the relevant doc in `docs/`:
- New gotcha discovered? Add it to the matching gotchas file.
- Architecture changed? Update `docs/SYSTEM_KNOWLEDGE_MAP.md`.
- New domain added? Create a new `docs/<domain>-gotchas.md` and link it below.
- Use Mermaid diagrams to describe complex flows, architecture, and relationships compactly.

## Skills

- **VueUse Skill** (`/vueuse-functions`): Contains all information about VueUse composables. Use this skill to find and apply suitable VueUse functions.

## Further Reading

**IMPORTANT:** Before starting any task, identify which docs below are relevant and read them first. Load the full context before making changes.

- `docs/SYSTEM_KNOWLEDGE_MAP.md` - Architecture overview, data flow diagrams
- `docs/excalidraw-gotchas.md` - Excalidraw integration pitfalls and patterns
- `docs/nuxt-gotchas.md` - Nuxt 4 specific pitfalls and migration notes
- `docs/advanced-patterns.md` - Vue 3 built-in components (Transition, Teleport, Suspense, KeepAlive) and advanced directives
- `docs/core-new-apis.md` - Vue 3 reactivity system, lifecycle hooks, and composable patterns
- `docs/script-setup-macros.md` - Vue 3 script setup syntax and compiler macros (defineProps, defineEmits, defineModel, etc.)
- `docs/vitest-mocking.md` - Mock functions, modules, timers, and dates with vi utilities
- `docs/vi-utilities.md` - vi helper for mocking, timers, utilities (vi.fn, vi.spyOn, vi.mock, fake timers, etc.)
