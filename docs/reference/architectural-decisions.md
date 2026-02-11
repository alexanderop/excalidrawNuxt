# Key Architectural Decisions

| Decision             | Choice                                                            | Rationale                                                                                      |
| -------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Rendering            | Native Canvas 2D + roughjs                                        | Hand-drawn aesthetic, Excalidraw format compat                                                 |
| Canvas layers        | Triple canvas (static/new-element/interactive)                    | Avoid re-rendering all elements during draw                                                    |
| State management     | Composables + shallowRef (no Pinia)                               | Canvas apps need raw performance, no Proxy overhead                                            |
| Reactivity           | shallowRef + markRaw for DOM/Canvas/RoughCanvas APIs              | Never proxy CanvasRenderingContext2D or RoughCanvas                                            |
| SSR                  | Disabled (ssr: false)                                             | Canvas API is browser-only                                                                     |
| Render loop          | useRafFn + dirty flags + configurable callbacks                   | Only re-render when state changes; renderer stays generic                                      |
| Deferred dirty flags | createDirtyFlags — stable no-op refs, bind() after renderer init  | Breaks circular init dependency without mutable object hack                                    |
| HiDPI                | devicePixelRatio scaling in bootstrapCanvas                       | Crisp rendering on Retina displays                                                             |
| Coordinate system    | screenToScene / sceneToScreen pure functions                      | Clean separation of screen vs scene space                                                      |
| Auto-imports         | Disabled (`imports: { autoImport: false }`)                       | Explicit imports improve IDE support, make files self-documenting, fix Vitest node-mode compat |
| Testing              | Vitest (node + browser projects)                                  | 60% unit / 30% integration / 10% visual — canvas apps need more unit tests                     |
| Test style           | Flat tests + `using` disposable                                   | No shared mutable state, automatic cleanup (see `docs/testing-conventions.md`)                 |
| Element mutation     | In-place mutateElement + versionNonce bump                        | Performance: called every pointermove during draw                                              |
| Shape cache          | Map keyed by id, invalidated by versionNonce                      | Avoid regenerating roughjs Drawables every frame                                               |
| roughjs integration  | RoughGenerator (headless, testable) + RoughCanvas (render)        | Generator works in Node tests; RoughCanvas created per canvas in onMounted                     |
| Tool shortcuts       | useMagicKeys + useActiveElement typing guard                      | Simple keyboard shortcuts, safe when typing in inputs                                          |
| Dark mode            | Programmatic color inversion (`invert(93%) + hue-rotate(180deg)`) | Same approach as Excalidraw — no separate dark palette, colors transformed at render time      |
| Theme persistence    | `useLocalStorage` via VueUse + `createGlobalState`                | Browser-only, not exported, each user sees preferred theme                                     |
| Groups               | Flat `groupIds` array on elements, no tree entity                 | Excalidraw-compatible model; groups are shared IDs, not separate objects                       |
| Binding              | `FixedPointBinding` with ratio-based coordinates                  | Arrows attach to shape surface via `[0-1, 0-1]` fixed point, survives resize/move              |
| Line tool            | Same linear model as arrow, no arrowheads/bindings                | `LinearToolType = 'arrow' \| 'line'` — reuses multi-point creation and linear editor           |
| Code element         | Rectangle + `customData` (not a new element type)                 | Syntax highlighting via Shiki, macOS-style code block rendered on canvas                       |
| Excalidraw types     | Re-export from `@excalidraw/element` package                      | Upstream compatibility; `SupportedElement` narrows to our supported subset                     |
