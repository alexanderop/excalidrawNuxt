# System Knowledge Map

## Architecture Overview

```mermaid
graph TD
    A[Nuxt 4 SPA Shell] --> B[Vue 3 Pages]
    B --> C[CanvasContainer.vue]
    C --> D[Triple Canvas Stack]
    D --> E1[Static Canvas - grid + elements]
    D --> E2[NewElement Canvas - in-progress shape]
    D --> E3[Interactive Canvas - selection UI + events]

    C --> F[Canvas Composables]
    F --> F1[useViewport - pan/zoom/coords]
    F --> F2[useRenderer - RAF loop + dirty flags + callbacks]

    C --> EL[Elements Feature]
    EL --> EL1[useElements - reactive element array]
    EL --> EL2[createElement - factory with defaults]
    EL --> EL3[mutateElement - in-place mutation + version bump]

    C --> RN[Rendering Feature]
    RN --> RN1[renderGrid - dot grid with zoom fade]
    RN --> RN2[shapeGenerator - roughjs Drawables + cache]
    RN --> RN3[renderElement / renderScene]
    RN --> RN5[arrowhead.ts - Canvas 2D arrowhead rendering]

    C --> TL[Tools Feature]
    TL --> TL1[useTool - active tool + keyboard shortcuts]
    TL --> TL2[useDrawingInteraction - pointer → shape/arrow]
    TL --> TL3[DrawingToolbar.vue - tool selection UI]

    C --> LE[Linear Editor Feature]
    LE --> LE1[useMultiPointCreation - click-to-place mode]
    LE --> LE2[useLinearEditor - double-click to edit points]
    LE --> LE3[pointHandles.ts - pure point manipulation]
    LE --> LE4[renderLinearEditor.ts - handles + rubber-band]

    C --> SL[Selection Feature]
    SL --> SL1[useSelection - selectedIds + computed bounds]
    SL --> SL2[useSelectionInteraction - state machine]
    SL --> SL3[hitTest - point-in-shape collision]
    SL --> SL4[transformHandles - handle positions + detection]
    SL --> SL5[dragElements - origin-based move]
    SL --> SL6[resizeElement - per-handle resize]
    SL --> SL7[bounds - AABB calculations]

    C --> BN[Binding Feature]
    BN --> BN1[proximity.ts - shape edge distance + fixedPoint]
    BN --> BN2[bindUnbind.ts - bind/unbind arrow endpoints]
    BN --> BN3[updateBoundPoints.ts - recalc on move/resize]
    BN --> BN4[renderBindingHighlight.ts - blue highlight]

    RN --> RN4[renderInteractive - selection borders + handles + marquee]

    A --> G[shared/]
    G --> G1[math.ts - Point, distance, clamp, lerp]
    G --> G2[random.ts - nanoid, randomInteger]

    style C fill:#f9a825,color:#000
    style D fill:#ef6c00,color:#fff
    style F fill:#1565c0,color:#fff
    style EL fill:#2e7d32,color:#fff
    style RN fill:#6a1b9a,color:#fff
    style TL fill:#c62828,color:#fff
```

## Canvas Architecture

```mermaid
flowchart LR
    subgraph "Triple Canvas Stack"
        SC[Static Canvas z:1]
        NC[NewElement Canvas z:1]
        IC[Interactive Canvas z:2]
    end

    subgraph "Canvas Composables"
        VP[useViewport]
        RD[useRenderer]
        PN[usePanning]
    end

    subgraph "Features"
        EL[useElements]
        TL[useTool]
        DI[useDrawingInteraction]
    end

    VP -->|scrollX, scrollY, zoom| RD
    RD -->|onRenderStatic callback| SC
    RD -->|onRenderNewElement callback| NC
    RD -->|onRenderInteractive callback| IC
    IC -->|wheel events| VP
    IC -->|pointer events| PN
    IC -->|pointer events| DI
    IC -->|pointer events| SI
    SI[useSelectionInteraction] -->|select/drag/resize| SEL[useSelection]
    SEL -->|selectedElements| IC
    RD -->|onRenderInteractive| IC
    TL -->|activeTool| SI
    TL -->|activeTool| PN
    TL -->|activeTool| DI
    DI -->|newElement| NC
    DI -->|onElementCreated| EL
    EL -->|elements| SC
```

## Render Pipeline

```mermaid
sequenceDiagram
    participant State as Viewport/Size Change
    participant Dirty as Dirty Flags
    participant RAF as useRafFn Loop
    participant Canvas as Canvas 2D + RoughCanvas

    State->>Dirty: markAllDirty()
    RAF->>Dirty: check flags each frame
    Dirty->>RAF: staticDirty=true
    RAF->>Canvas: bootstrapCanvas(ctx, dpr, w, h, bgColor)
    RAF->>Canvas: onRenderStatic → renderGrid + renderScene
    RAF->>Dirty: staticDirty=false
    Note over RAF,Canvas: newElement dirty → onRenderNewElement → renderElement
```

## Shape Drawing Flow (Phase 2)

```mermaid
sequenceDiagram
    participant User as User Input
    participant DI as useDrawingInteraction
    participant EL as createElement/mutateElement
    participant SG as shapeGenerator
    participant RC as RoughCanvas

    User->>DI: pointerdown (with drawing tool active)
    DI->>EL: createElement(type, sceneX, sceneY)
    DI->>DI: set newElement, capture pointer

    User->>DI: pointermove (drag)
    DI->>EL: mutateElement(el, {x, y, width, height})
    DI->>DI: markNewElementDirty()
    Note over DI: shift-constraint + negative normalization

    User->>DI: pointerup
    DI->>DI: onElementCreated(el) → addElement
    DI->>DI: reset tool to selection
    DI->>DI: markStaticDirty()
    Note over SG,RC: RAF renders via generateShape → rc.draw
```

## Feature-Based Architecture

```mermaid
graph LR
    subgraph "app/"
        Pages[pages/index.vue]
        subgraph "features/"
            Canvas[canvas/]
            Elements[elements/]
            Rendering[rendering/]
            Tools[tools/]
            LinearEditor[linear-editor/]
            Binding[binding/]
        end
        subgraph "shared/"
            Math[math.ts]
            Random[random.ts]
        end
    end

    Pages --> Canvas
    Canvas --> Elements
    Canvas --> Rendering
    Canvas --> Tools
    Tools --> Elements
    Rendering --> Elements
    LinearEditor --> Elements
    Binding --> Elements
    Tools --> Binding
    LinearEditor --> Binding
    Canvas --> Binding
    Canvas --> LinearEditor
    Canvas --> Math
    Canvas --> Random
    Elements --> Random
```

### Import Rules

1. **Pages** can import from **features** (pages are top-level orchestrators)
2. **Features** can import from **shared** (zero-dependency utilities)
3. **Features** can import from **other features** (canvas orchestrates elements, rendering, tools)
4. **shared/** imports from nothing — it is dependency-free
5. **components/** and **composables/** (top-level) cannot import from **features/**

## Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Rendering | Native Canvas 2D + roughjs | Hand-drawn aesthetic, Excalidraw format compat |
| Canvas layers | Triple canvas (static/new-element/interactive) | Avoid re-rendering all elements during draw |
| State management | Composables + shallowRef (no Pinia) | Canvas apps need raw performance, no Proxy overhead |
| Reactivity | shallowRef + markRaw for DOM/Canvas/RoughCanvas APIs | Never proxy CanvasRenderingContext2D or RoughCanvas |
| SSR | Disabled (ssr: false) | Canvas API is browser-only |
| Render loop | useRafFn + dirty flags + configurable callbacks | Only re-render when state changes; renderer stays generic |
| HiDPI | devicePixelRatio scaling in bootstrapCanvas | Crisp rendering on Retina displays |
| Coordinate system | screenToScene / sceneToScreen pure functions | Clean separation of screen vs scene space |
| Auto-imports | Disabled (`imports: { autoImport: false }`) | Explicit imports improve IDE support, make files self-documenting, fix Vitest node-mode compat |
| Testing | Vitest (node + browser projects) | 60% unit / 30% integration / 10% visual — canvas apps need more unit tests |
| Test style | Flat tests + `using` disposable | No shared mutable state, automatic cleanup (see `docs/testing-conventions.md`) |
| Element mutation | In-place mutateElement + versionNonce bump | Performance: called every pointermove during draw |
| Shape cache | Map keyed by id, invalidated by versionNonce | Avoid regenerating roughjs Drawables every frame |
| roughjs integration | RoughGenerator (headless, testable) + RoughCanvas (render) | Generator works in Node tests; RoughCanvas created per canvas in onMounted |
| Tool shortcuts | useMagicKeys + useActiveElement typing guard | Simple keyboard shortcuts, safe when typing in inputs |

## Testing Architecture

```mermaid
graph TD
    subgraph "vitest.config.ts"
        UP[Unit Project — node mode]
        BP[Browser Project — Playwright/Chromium]
    end

    UP --> UT["*.unit.test.ts (co-located)"]
    BP --> BT["*.browser.test.ts (co-located)"]

    subgraph "app/__test-utils__/"
        WS[withSetup.ts — effectScope wrapper]
        subgraph "factories/"
            VF[viewport.ts]
            PF[point.ts]
            EF[element.ts]
        end
    end

    UT --> WS
    UT --> VF
    UT --> PF
    UT --> EF
```

### Testing Pyramid (Canvas App)

| Layer | Target % | What | How |
|-------|---------|------|-----|
| Unit (node) | 60% | Pure functions, composables | `*.unit.test.ts`, fast, no DOM |
| Integration (browser) | 30% | Event wiring, DOM classes, component mounting | `*.browser.test.ts`, real Chromium |
| Visual | 10% | Canvas pixel output | Future: screenshot comparison |

### Naming Conventions

- `app/shared/math.unit.test.ts` — co-located unit test
- `app/features/canvas/components/CanvasContainer.browser.test.ts` — co-located browser test
- `app/__test-utils__/` — shared helpers and factories

### Key Decisions

- **No `@nuxt/test-utils`** — overkill for SPA with no SSR
- **No jsdom/happy-dom** — unit tests run in node (pure functions), browser tests use real Chromium
- **`withSetup` returns `T & Disposable`** — use with `using` keyword for automatic `effectScope` cleanup (see `docs/testing-conventions.md`)
- **Test files excluded from `nuxi typecheck`** via `typescript.tsConfig.exclude` in nuxt config
- **Vitest globals enabled** — `describe`, `it`, `expect` available without imports

## File Map

```mermaid
graph LR
    subgraph Root
        NC[nuxt.config.ts]
        PK[package.json]
        VC[vitest.config.ts]
    end

    subgraph "app/"
        AV[app.vue]
        subgraph "pages/"
            PI[index.vue]
        end
        subgraph "features/canvas/"
            CO[coords.ts]
            CIX[index.ts]
            subgraph "canvas/composables/"
                UV[useViewport.ts]
                UR[useRenderer.ts]
                UP[usePanning.ts]
            end
            subgraph "canvas/components/"
                CC[CanvasContainer.vue]
            end
        end
        subgraph "features/elements/"
            ET[types.ts]
            EC[constants.ts]
            ECR[createElement.ts]
            EM[mutateElement.ts]
            UE[useElements.ts]
        end
        subgraph "features/rendering/"
            RG[renderGrid.ts]
            SG[shapeGenerator.ts]
            RE[renderElement.ts]
            RS[renderScene.ts]
            RI[renderInteractive.ts]
            AH[arrowhead.ts]
        end
        subgraph "features/selection/"
            SLC[constants.ts]
            SLB[bounds.ts]
            SLH[hitTest.ts]
            SLTH[transformHandles.ts]
            SLD[dragElements.ts]
            SLR[resizeElement.ts]
            subgraph "selection/composables/"
                SLS[useSelection.ts]
                SLSI[useSelectionInteraction.ts]
            end
        end
        subgraph "features/linear-editor/"
            LEC[constants.ts]
            LET[types.ts]
            LEPH[pointHandles.ts]
            LEMPC[useMultiPointCreation.ts]
            LELE[useLinearEditor.ts]
            LERLE[renderLinearEditor.ts]
            LEIX[index.ts]
        end
        subgraph "features/binding/"
            BT[types.ts]
            BC[constants.ts]
            BP[proximity.ts]
            BBU[bindUnbind.ts]
            BUBP[updateBoundPoints.ts]
            BRH[renderBindingHighlight.ts]
            BIX[index.ts]
        end
        subgraph "features/tools/"
            TT[types.ts]
            UT2[useTool.ts]
            UDI[useDrawingInteraction.ts]
            subgraph "tools/components/"
                DT[DrawingToolbar.vue]
                TI[toolIcons.ts]
            end
        end
        subgraph "shared/"
            MT[math.ts]
            RN[random.ts]
        end
        subgraph "utils/"
            TC[tryCatch.ts]
        end
        subgraph "__test-utils__/"
            WS[withSetup.ts]
            subgraph "factories/"
                VPF[viewport.ts]
                PTF[point.ts]
                ELF[element.ts]
            end
        end
    end

    subgraph "docs/ — Agent Memory"
        SK[SYSTEM_KNOWLEDGE_MAP.md]
        EG[excalidraw-gotchas.md]
        NG[nuxt-gotchas.md]
    end
```

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

> **Note:** This map reflects the current state after arrow binding (arrows attach to shapes and follow on move/resize). Update when new features/directories are added.

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
