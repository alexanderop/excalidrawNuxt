# CLAUDE.md

Excalidraw Nuxt is a collaborative drawing app built with Nuxt 4 and Excalidraw.

## Commands

```
bun dev           # Start dev server
bun build         # Production build
bun preview       # Preview production build
bun lint          # Run oxlint then eslint (run-s lint:*)
bun typecheck     # Type-check with nuxi
bun test          # Run all tests (vitest run --bail=1)
bun test:unit     # Unit tests only (vitest --project unit)
bun test:browser  # Browser tests only (vitest --project browser)
```

## Stack

- Nuxt 4 (Vue 3.5+), SSR disabled, **auto-imports disabled** (`imports: { autoImport: false }` in nuxt.config — all imports must be explicit)
- Excalidraw (via @excalidraw/excalidraw)
- Tailwind CSS v4 (via `@tailwindcss/vite`, not the Nuxt module)
- TypeScript
- RoughJS + perfect-freehand (canvas shape rendering)
- VueUse (`@vueuse/core`)
- Bun package manager

## Colors

Defined in `app/assets/css/main.css` via `@theme`. Use these as Tailwind utilities:

- `base` — `rgb(33,39,55)` dark navy background
- `foreground` — `rgb(234,237,243)` light gray text
- `accent` — `rgb(255,107,237)` hot pink highlights
- `surface` — `rgb(52,63,96)` cards/panels
- `subdued` — `rgb(138,51,123)` subdued purple
- `edge` — `rgb(171,75,153)` borders/dividers

## Excalidraw Reference Source

The original Excalidraw source code lives in `excalidraw/` (git-ignored, not part of our build). When planning or implementing any feature, **always browse the Excalidraw source first** to understand how they solved the same problem. Use it as inspiration, then adapt and improve the approach for our Nuxt/Vue architecture — idiomatic composables, Vue reactivity, `<script setup>`, and our project conventions. Don't copy React patterns verbatim; translate them into clean Vue equivalents.

## Structure

- `app/` - Vue application
  - `features/` - Domain features (binding, canvas, code, elements, groups, linear-editor, rendering, selection, theme, tools) — isolated by lint rules
  - `shared/` - Shared components and composables used across features
  - `pages/` - Top-level page orchestrators
  - `utils/` - Pure utilities (e.g. `tryCatch.ts`)
  - `assets/` - CSS and static assets
  - `__test-utils__/` - Test helpers (withSetup, custom commands, browser helpers, factories, mocks, matchers, serializers)
- `excalidraw/` - Excalidraw source (reference only, git-ignored)
- `public/` - Static assets
- `nuxt.config.ts` - Nuxt configuration
- `docs/` - Agent memory (gotchas, patterns, architecture, specs, diagrams)

## Canvas Testing

Browser tests (`*.browser.test.ts`) test canvas interactions via Vitest browser mode + Playwright. **Never use `page.mouse`** for canvas events — iframe coordinate mismatches cause silent failures. Use the custom commands (`canvasDrag`, `canvasClick`, `canvasDblClick`) which dispatch `PointerEvent`s directly inside the iframe via `frame.evaluate`. See `app/__test-utils__/commands/`. Browser tests also have high-level helpers in `app/__test-utils__/browser/` (`Pointer`, `Keyboard`, `UI`, `CanvasGrid`, etc.).

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

### Architecture & System
- `docs/SYSTEM_KNOWLEDGE_MAP.md` - Architecture overview, data flow diagrams
- `docs/diagrams/` - Mermaid diagrams (architecture, canvas, coordinate system, event flow, render pipeline, selection state machine, etc.)
- `docs/reference/` - Architectural decisions, element types, technology stack
- `docs/excalidraw-state-and-persistence.md` - How Excalidraw manages state, persistence, history/undo, and collaboration

### Gotchas & Pitfalls
- `docs/excalidraw-gotchas.md` - Excalidraw integration pitfalls and patterns
- `docs/nuxt-gotchas.md` - Nuxt 4 specific pitfalls and migration notes
- `docs/vueuse-gotchas.md` - VueUse pitfalls (useMagicKeys types, document access in node tests, browser vitest config)

### Vue & TypeScript Patterns
- `docs/vue-design-patterns.md` - 12 Vue design patterns for refactoring and component planning (Data Store, Thin Composables, Humble/Controller Components, Strategy, etc.)
- `docs/advanced-patterns.md` - Vue 3 built-in components (Transition, Teleport, Suspense, KeepAlive) and advanced directives
- `docs/core-new-apis.md` - Vue 3 reactivity system, lifecycle hooks, and composable patterns
- `docs/script-setup-macros.md` - Vue 3 script setup syntax and compiler macros (defineProps, defineEmits, defineModel, etc.)

### Testing
- `docs/testing-conventions.md` - Flat test philosophy, withSetup API, when hooks are OK
- `docs/vitest-mocking.md` - Mock functions, modules, timers, and dates with vi utilities
- `docs/vi-utilities.md` - vi helper for mocking, timers, utilities (vi.fn, vi.spyOn, vi.mock, fake timers, etc.)
- `docs/our-testing-strategy.md` - Our project testing strategy
- `docs/excalidraw-testing-strategy.md` - Excalidraw testing strategy reference
- `docs/testing-refactor-plan.md` - Testing infrastructure refactor plan

### Linting
- `docs/linting-setup.md` - Dual linter setup, banned patterns, component naming rules, cross-feature isolation

### Feature Specs
- `docs/arrow-tool-spec.md` - Arrow tool design and Excalidraw reference
- `docs/arrow-tech-spec.md` - Arrow technical specification (reverse-engineered from Excalidraw)
- `docs/arrow-parity-spec.md` - Arrow UX parity with Excalidraw
- `docs/dark-mode-tech-spec.md` - Dark mode technical specification
- `docs/bound-text-debug-notes.md` - Bound text feature implementation notes and gotchas
- `docs/specs/` - Feature specs (arrow implementation plan, grouping feature)
