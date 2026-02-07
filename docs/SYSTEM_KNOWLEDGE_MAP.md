# System Knowledge Map

> Lightweight index — each diagram lives in its own file under `docs/diagrams/`. Load only what you need.

## Diagrams

| Diagram | File | What it shows |
|---------|------|---------------|
| Architecture Overview | [diagrams/architecture-overview.md](diagrams/architecture-overview.md) | Full dependency graph: Nuxt shell → pages → features → composables |
| Canvas Architecture | [diagrams/canvas-architecture.md](diagrams/canvas-architecture.md) | Triple canvas stack data flow + composable wiring |
| Render Pipeline | [diagrams/render-pipeline.md](diagrams/render-pipeline.md) | Dirty-flag driven RAF loop sequence |
| Shape Drawing Flow | [diagrams/shape-drawing-flow.md](diagrams/shape-drawing-flow.md) | Pointer event sequence for creating shapes/arrows |
| Feature Architecture | [diagrams/feature-architecture.md](diagrams/feature-architecture.md) | Feature directory layout + import rules |
| Testing Architecture | [diagrams/testing-architecture.md](diagrams/testing-architecture.md) | Vitest dual-project setup + testing pyramid |
| File Map | [diagrams/file-map.md](diagrams/file-map.md) | Complete file tree of every module |

## Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Rendering | Native Canvas 2D + roughjs | Hand-drawn aesthetic, Excalidraw format compat |
| Canvas layers | Triple canvas (static/new-element/interactive) | Avoid re-rendering all elements during draw |
| State management | Composables + shallowRef (no Pinia) | Canvas apps need raw performance, no Proxy overhead |
| Reactivity | shallowRef + markRaw for DOM/Canvas/RoughCanvas APIs | Never proxy CanvasRenderingContext2D or RoughCanvas |
| SSR | Disabled (ssr: false) | Canvas API is browser-only |
| Render loop | useRafFn + dirty flags + configurable callbacks | Only re-render when state changes; renderer stays generic |
| Deferred dirty flags | createDirtyFlags — stable no-op refs, bind() after renderer init | Breaks circular init dependency without mutable object hack |
| HiDPI | devicePixelRatio scaling in bootstrapCanvas | Crisp rendering on Retina displays |
| Coordinate system | screenToScene / sceneToScreen pure functions | Clean separation of screen vs scene space |
| Auto-imports | Disabled (`imports: { autoImport: false }`) | Explicit imports improve IDE support, make files self-documenting, fix Vitest node-mode compat |
| Testing | Vitest (node + browser projects) | 60% unit / 30% integration / 10% visual — canvas apps need more unit tests |
| Test style | Flat tests + `using` disposable | No shared mutable state, automatic cleanup (see `docs/testing-conventions.md`) |
| Element mutation | In-place mutateElement + versionNonce bump | Performance: called every pointermove during draw |
| Shape cache | Map keyed by id, invalidated by versionNonce | Avoid regenerating roughjs Drawables every frame |
| roughjs integration | RoughGenerator (headless, testable) + RoughCanvas (render) | Generator works in Node tests; RoughCanvas created per canvas in onMounted |
| Tool shortcuts | useMagicKeys + useActiveElement typing guard | Simple keyboard shortcuts, safe when typing in inputs |

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Nuxt 4 (SPA) | Shell, routing (auto-imports disabled) |
| UI | Vue 3.5+ | Composition API, shallowRef |
| Styling | Tailwind CSS 4 | UI layout (not canvas) |
| Canvas shapes | roughjs | Hand-drawn rendering |
| Freedraw | perfect-freehand | Pressure-sensitive strokes (Phase 4+) |
| Composables | VueUse | Events, RAF, element size, magic keys |
| IDs | nanoid | Element ID generation |
| Math | shared/math.ts | Point/vector utilities |

## Element Types

| Type | Model | Notes |
|------|-------|-------|
| `rectangle` | Box (x, y, width, height) | Standard shape |
| `ellipse` | Box (x, y, width, height) | Standard shape |
| `diamond` | Box (x, y, width, height) | Standard shape |
| `arrow` | Points-based (x, y, points[]) | `points` are relative to `x,y`. First point always `[0,0]`. `width`/`height` derived from points AABB. No rotation handles (Phase 1). |

### Arrow-Specific Architecture

- **Tool types**: `LinearToolType = 'arrow'` vs `ShapeToolType = 'rectangle' | 'ellipse' | 'diamond'`. Guards: `isLinearTool()`, `isShapeTool()`.
- **Drawing**: `useDrawingInteraction` branches on `isLinearTool()` — arrows update `points[]`, shapes update `width/height`. After initial drag, linear tools enter multi-point mode via `onMultiPointStart` callback.
- **Multi-point creation**: `useMultiPointCreation` — after initial 2-point drag, click-to-place additional points. Rubber-band line from last point to cursor. Finalize with Escape/Enter/dblclick or tool switch.
- **Linear editor**: `useLinearEditor` — double-click an existing arrow to edit points. Point handles rendered at vertices, midpoint indicators on segments. Drag to move points, click midpoint to insert, Delete to remove (min 2). Shift-click for multi-select. Escape or click empty space to exit.
- **Point normalization**: `points[0]` always at `(0,0)`. When moved, `element.x/y` shifts and all other points offset to compensate.
- **Rendering**: roughjs `linearPath()` for shaft, Canvas 2D for arrowheads (`arrowhead.ts`). Arrowhead styles: `'arrow'` (V-shape) and `'triangle'` (filled). Interactive overlays (handles, rubber-band) rendered via `renderLinearEditor.ts`.
- **Hit testing**: Point-to-line-segment distance (reuses `distanceToSegment`). Point handle and midpoint handle hit testing via `pointHandles.ts`.
- **Selection**: AABB bounding box, no transform handles. Point handles appear in linear editor mode.
- **Shift-drag**: Snaps to 15-degree increments via `snapAngle()` in `shared/math.ts`.

### Linear Editor Feature (`features/linear-editor/`)

| File | Purpose |
|------|---------|
| `constants.ts` | Handle sizes, colors, thresholds |
| `types.ts` | `MultiPointCreationState`, `LinearEditorState` types |
| `pointHandles.ts` | Pure functions: positions, hit detection, insert/remove/move points, normalization |
| `useMultiPointCreation.ts` | Composable: click-to-place after initial drag, rubber-band preview |
| `useLinearEditor.ts` | Composable: double-click to enter, drag/insert/delete points |
| `renderLinearEditor.ts` | Render point handles, midpoint indicators, rubber-band line |
| `index.ts` | Barrel exports |

### Binding Feature (`features/binding/`)

Arrows attach to shapes via `FixedPointBinding` (elementId + 0-1 ratio on bbox). Moving/resizing a shape automatically updates bound arrow endpoints.

| File | Purpose |
|------|---------|
| `types.ts` | `BindableElement` union (rect/ellipse/diamond), `isBindableElement()` guard |
| `constants.ts` | `BASE_BINDING_GAP=5`, `BASE_BINDING_DISTANCE=15`, `MINIMUM_ARROW_SIZE=20`, highlight colors |
| `proximity.ts` | `getHoveredElementForBinding()` proximity detection, `distanceToShapeEdge()` per shape type, `computeFixedPoint()` / `getPointFromFixedPoint()` coordinate conversion |
| `bindUnbind.ts` | `bindArrowToElement()` — mutates arrow binding + shape boundElements. `unbindArrowEndpoint()` / `unbindArrow()` / `unbindAllArrowsFromShape()` |
| `updateBoundPoints.ts` | `updateBoundArrowEndpoints(shape)` — recalculates all bound arrow positions. `updateArrowEndpoint(arrow, endpoint, target)` — snaps single endpoint to shape edge |
| `renderBindingHighlight.ts` | `renderSuggestedBinding()` — blue outline (rect/ellipse/diamond aware, rotation aware) |
| `index.ts` | Barrel exports |

**Key types on elements:**
- `ExcalidrawElementBase.boundElements: readonly BoundElement[]` — which arrows are bound to this shape
- `ExcalidrawArrowElement.startBinding/endBinding: FixedPointBinding | null` — which shape each endpoint is bound to

**Integration points:**
- `useDrawingInteraction` — proximity check on pointermove, bind on pointerup, MINIMUM_ARROW_SIZE validation
- `useSelectionInteraction` — update bound arrows on drag/resize/nudge, unbind arrows on whole-arrow drag, unbind before delete
- `useMultiPointCreation` — suggested bindings on pointermove, end binding on finalize
- `useLinearEditor` — suggested bindings when dragging endpoints, bind/unbind on pointerup
- `renderInteractiveScene` — renders suggestedBindings array before selection overlays
- `useSceneRenderer` — passes suggestedBindings through to render callback

> **Note:** This map reflects the current state after arrow binding. Update when new features/directories are added.
