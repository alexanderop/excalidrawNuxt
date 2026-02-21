# CLAUDE.md

DrawVue is a collaborative drawing app built as a monorepo: a reusable Vue drawing library (`@drawvue/core`) consumed by a Nuxt 4 app.

## Commands

**All commands must be run from the workspace root** (`/Users/alexanderopalic/Projects/Nuxt/excalidrawNuxt`). Running `pnpm lint` etc. from a subdirectory like `packages/core/` will fail with "Command not found" because the scripts live in the root `package.json`.

```
pnpm run lint          # Run oxlint then eslint (run-s lint:*)
pnpm run typecheck     # Type-check with nuxi
pnpm run test          # Run all tests (vitest run --bail=1)
pnpm run test:unit     # Unit tests only (vitest --project unit)
pnpm run test:browser  # Browser tests only (vitest --project browser)
pnpm run dev           # Start Nuxt dev server
pnpm run build         # Production build
pnpm run preview       # Preview production build
pnpm run core:build    # Build @drawvue/core library (unbuild)
pnpm run core:dev      # Dev mode for @drawvue/core (unbuild --stub)
```

## Stack

- **Monorepo** with pnpm workspaces (`pnpm-workspace.yaml`)
- **`@drawvue/core`** — framework-agnostic Vue drawing library (unbuild, peer dep on Vue 3.5+)
- **Nuxt 4** (Vue 3.5+), SSR disabled, **auto-imports disabled** (`imports: { autoImport: false }` — all imports must be explicit)
- **@nuxt/ui** v4 — UI component framework (Nuxt module, provides Tailwind integration); `@tailwindcss/vite` used in browser test configs
- TypeScript, RoughJS + perfect-freehand (canvas shape rendering)
- `@excalidraw/math`, `@excalidraw/element`, `@excalidraw/common` — Excalidraw math and element utilities
- VueUse (`@vueuse/core`), Shiki (code highlighting)
- `@huggingface/transformers` — AI-powered background removal
- tinycolor2 — Color manipulation
- pnpm package manager

## Colors

Defined in `packages/core/src/assets/theme.css` via `@theme` (imported into `app/assets/css/main.css` via `@import "@drawvue/core/theme.css"`). Use these as Tailwind utilities:

- `base` — `rgb(33,39,55)` dark navy background
- `foreground` — `rgb(234,237,243)` light gray text
- `accent` — `rgb(255,107,237)` hot pink highlights
- `surface` — `rgb(52,63,96)` cards/panels
- `subdued` — `rgb(138,51,123)` subdued purple
- `edge` — `rgb(171,75,153)` borders/dividers

## Excalidraw Reference Source

The original Excalidraw source code lives in `excalidraw/` (git-ignored, not part of our build). When planning or implementing any feature, **always browse the Excalidraw source first** to understand how they solved the same problem. Use it as inspiration, then adapt and improve the approach for our Vue architecture — idiomatic composables, Vue reactivity, `<script setup>`, and our project conventions. Don't copy React patterns verbatim; translate them into clean Vue equivalents.

## Structure

```
packages/core/              # @drawvue/core — reusable drawing library
├── src/
│   ├── components/         # DrawVue.vue (main canvas component with slots)
│   ├── context.ts          # DrawVueContext provide/inject system
│   ├── index.ts            # Public API exports
│   ├── features/           # All 18 domain feature modules:
│   │   ├── binding/        #   Text binding to shapes
│   │   ├── canvas/         #   Canvas layers, viewport, rendering orchestration
│   │   ├── clipboard/      #   Element clipboard
│   │   ├── code/           #   Code element rendering & Shiki integration
│   │   ├── command-palette/ #  Command palette logic
│   │   ├── context-menu/   #   Context menu items & composables
│   │   ├── elbow/          #   Elbow arrow routing (A* pathfinding)
│   │   ├── elements/       #   Element creation, mutation, types
│   │   ├── export/         #   Export to canvas/PNG/clipboard
│   │   ├── groups/         #   Grouping utilities & composables
│   │   ├── history/        #   Undo/redo system
│   │   ├── image/          #   Image cache & interaction
│   │   ├── linear-editor/  #   Arrow/line point editing
│   │   ├── properties/     #   Property panel logic & style defaults
│   │   ├── rendering/      #   Canvas rendering pipeline
│   │   ├── selection/      #   Selection, hit testing, transforms
│   │   ├── theme/          #   Theme management (dark/light)
│   │   └── tools/          #   Tool interactions (draw, text, etc.)
│   ├── shared/             # Action registry, keyboard shortcuts, math, curve math, shape handler/shape registries, tool types
│   ├── utils/              # tryCatch
│   ├── assets/             # theme.css
│   └── __test-utils__/     # Unit test helpers (factories, mocks, matchers, withSetup, withDrawVue)
├── build.config.ts         # unbuild library config
├── vitest.config.ts        # Core unit tests (node env)
├── package.json
└── tsconfig.json

app/                        # Nuxt consumer app (UI layer only)
├── features/               # Presentation components & browser tests:
│   ├── canvas/components/  #   BottomBar.vue (zoom/undo/redo)
│   ├── clipboard/          #   Clipboard UI & tests
│   ├── code/               #   Code element UI & tests
│   ├── command-palette/    #   CommandPalette.vue
│   ├── context-menu/       #   Context menu UI
│   ├── dev-inspector/      #   Dev inspector overlay
│   ├── export/             #   ExportDialog.vue, download & clipboard utils
│   ├── history/            #   History UI & tests
│   ├── image/              #   Image UI & tests
│   ├── linear-editor/      #   Linear editor UI & tests
│   ├── properties/components/ # PropertiesPanel.vue, ColorSwatch, ArrowheadPicker, etc.
│   ├── rendering/          #   Rendering UI & tests
│   ├── selection/          #   Selection UI & tests
│   ├── theme/              #   Theme toggle UI
│   └── tools/components/   #   DrawingToolbar.vue, toolIcons.ts
├── composables/            # useBackgroundRemoval.ts, useImageActions.ts
├── workers/                # background-removal.worker.ts
├── pages/                  # index.vue (uses <DrawVue> with slots)
├── assets/css/             # main.css (Tailwind + theme)
├── __test-utils__/         # Browser test helpers (page objects, commands, Pointer, UI, etc.)
│   └── browser/            #   DrawVueTestHarness.vue, CanvasGrid, API helpers
├── *.browser.test.ts       # Browser integration tests (in feature dirs)
excalidraw/                 # Excalidraw source (reference only, git-ignored)
docs/                       # Agent memory (gotchas, patterns, architecture, specs)
```

## Import Patterns

App code imports from the core library — never reach into internal paths:

```typescript
// In app/ components
import { DrawVue } from "@drawvue/core";
import { useStyleDefaults, Arrowhead, FillStyle } from "@drawvue/core";

// In app/ test files
import { getH, createTestElement, reseed, withDrawVue } from "@drawvue/core/test-utils";

// Theme CSS
import "@drawvue/core/theme.css";
```

Within `packages/core/src/`, use relative imports between features.

## DrawVue Context System

`@drawvue/core` uses Vue's provide/inject for multi-instance support. The `DrawVue` component provides a `DrawVueContext` containing all state slices:

- `elements` — Element state (add, replace, query)
- `tool` — Active tool management
- `actionRegistry` — Registered action definitions
- `clipboard` — Element clipboard
- `imageCache` — Image caching
- `styleDefaults` — Default style properties
- `styleClipboard` — Style copy/paste
- `commandPalette` — Command palette state
- `selection` — Selected elements and selection function
- `history` — History recording (undo/redo actions)
- `dirty` — Dirty flag management for re-rendering

Consumers use `useDrawVue()` to access the context. The `DrawVue` component provides slots: `#toolbar`, `#bottom-bar`, `#properties`.

## Canvas Testing

Browser tests (`*.browser.test.ts`) test canvas interactions via Vitest browser mode + Playwright. **Never use `page.mouse`** for canvas events — iframe coordinate mismatches cause silent failures. Use the custom commands (`canvasDrag`, `canvasClick`, `canvasDblClick`, `showGridOverlay`) which dispatch `PointerEvent`s directly inside the iframe via `frame.evaluate`. See `app/__test-utils__/commands/`. Browser tests also have high-level helpers in `app/__test-utils__/browser/` (`Pointer`, `Keyboard`, `UI`, `CanvasGrid`, etc.).

## Testing Architecture

Three vitest projects:

1. **`vitest.config.unit.ts`** — App-level unit tests
2. **`vitest.config.browser.ts`** — Browser integration tests (Playwright)
3. **`packages/core/vitest.config.ts`** — Core library unit tests (node env)

## Action Registry

All user-triggerable operations (tools, clipboard, layers, flips, etc.) are defined as `ActionDefinition` objects and stored in a global `useActionRegistry` singleton (in `@drawvue/core`). Each action has an `id` (namespaced like `clipboard:copy`, `layer:bring-to-front`, `tool:rectangle`), a `label`, an `icon`, optional keyboard shortcuts (`kbds`), a `handler`, and an optional `enabled` predicate.

Consumers never call handlers directly — they reference actions by ID:

- **Context menu** (`contextMenuItems.ts`) — declarative lists of `{ actionId }` entries and separators, resolved at render time via the registry.
- **Command palette** (`commandGroups.ts`) — grouped action ID lists displayed as searchable commands.
- **Keyboard shortcuts** — bound via `kbds` on the action definition.

To add a new operation: define an `ActionDefinition`, register it, and reference its ID in whichever trigger surfaces need it.

## Shape Handler Registry

Rendering uses a registry of per-shape handlers in `features/rendering/handlers/`. Each handler implements rendering logic for a specific element type (rectangle, ellipse, arrow, text, etc.). The shape registry in `shared/` maps element types to their handlers, making it easy to add new shape types without modifying the core rendering pipeline.

## Docs = Memory

**Do NOT use Claude Code's built-in memory (`~/.claude/projects/.../memory/`).** The `docs/` folder IS the agent memory. It is version-controlled, shared across sessions, and agents maintain it themselves.

**After completing any task**, update the relevant doc in `docs/`:

- New gotcha discovered? Add it to the matching gotchas file.
- Architecture changed? Update `docs/SYSTEM_KNOWLEDGE_MAP.md`.
- New domain added? Create a new `docs/<domain>-gotchas.md` and link it below.
- Use Mermaid diagrams to describe complex flows, architecture, and relationships compactly.

## Skills

- **Nuxt UI Skill** (`/nuxt-ui`): Contains all information about @nuxt/ui v4 components and theming. **Always consult this skill** when building or modifying Vue components, layouts, forms, or any UI work.
- **VueUse Skill** (`/vueuse-functions`): Contains all information about VueUse composables. **Always consult this skill** when working with Vue composables or looking for reactive utilities.

## Further Reading

**IMPORTANT:** Before starting any task, identify which docs below are relevant and read them first. Load the full context before making changes.

### Architecture & System

- `docs/SYSTEM_KNOWLEDGE_MAP.md` - Architecture overview, data flow diagrams
- `docs/diagrams/` - Mermaid diagrams (architecture, canvas, coordinate system, event flow, render pipeline, selection state machine, etc.)
- `docs/reference/` - Architectural decisions, element types, technology stack
- `docs/excalidraw-state-and-persistence.md` - How Excalidraw manages state, persistence, history/undo, and collaboration
- `docs/architecture-review-pr4-eraser-tool.md` - Eraser tool architecture review
- `docs/vue-library-best-practices.md` - Vue library best practices
- `docs/plans/` - Implementation plans directory

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
- `docs/context-menu-properties-spec.md` - Context menu + properties spec
- `docs/specs/` - Feature specs (arrow implementation plan, grouping feature)
