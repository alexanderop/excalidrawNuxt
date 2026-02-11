# Technology Stack

| Layer               | Technology                                                | Purpose                                                      |
| ------------------- | --------------------------------------------------------- | ------------------------------------------------------------ |
| Framework           | Nuxt 4 (SPA)                                              | Shell, routing (auto-imports disabled)                       |
| UI                  | Vue 3.5+                                                  | Composition API, shallowRef                                  |
| Styling             | Tailwind CSS 4                                            | UI layout (not canvas)                                       |
| Canvas shapes       | roughjs                                                   | Hand-drawn rendering                                         |
| Freedraw            | perfect-freehand                                          | Pressure-sensitive strokes (Phase 4+)                        |
| Composables         | VueUse                                                    | Events, RAF, element size, magic keys                        |
| IDs                 | nanoid                                                    | Element ID generation                                        |
| Dark mode colors    | tinycolor2                                                | Color parsing + invert/hue-rotate for dark mode              |
| Syntax highlighting | Shiki                                                     | Code element token highlighting (lazy-loaded)                |
| Excalidraw types    | @excalidraw/element, @excalidraw/math, @excalidraw/common | Official type definitions, math primitives, shared utilities |
| Testing             | Vitest (node + browser) + Playwright                      | Unit and browser integration tests                           |
| Package manager     | Bun                                                       | Fast installs, scripts via `bun run`                         |
| Linting             | Oxlint + ESLint                                           | Dual linter: oxlint (fast) then ESLint                       |
| Math                | shared/math.ts                                            | Point/vector utilities (re-exports from @excalidraw/math)    |
