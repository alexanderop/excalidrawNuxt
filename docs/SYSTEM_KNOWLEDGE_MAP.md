# System Knowledge Map

## Architecture Overview

```mermaid
graph TD
    A[Nuxt 4 SPA Shell] --> B[Vue 3 Pages]
    B --> C[CanvasContainer.vue]
    C --> D[Triple Canvas Stack]
    D --> E1[Static Canvas - grid + elements]
    D --> E2[NewElement Canvas - in-progress]
    D --> E3[Interactive Canvas - selection UI + events]

    C --> F[Composables]
    F --> F1[useViewport - pan/zoom/coords]
    F --> F2[useRenderer - RAF loop + dirty flags]

    A --> G[shared/]
    G --> G1[math.ts - Point, distance, clamp, lerp]
    G --> G2[random.ts - nanoid, randomInteger]

    style C fill:#f9a825,color:#000
    style D fill:#ef6c00,color:#fff
    style F fill:#1565c0,color:#fff
```

## Canvas Architecture

```mermaid
flowchart LR
    subgraph "Triple Canvas Stack"
        SC[Static Canvas z:1]
        NC[NewElement Canvas z:1]
        IC[Interactive Canvas z:2]
    end

    subgraph "Composables"
        VP[useViewport]
        RD[useRenderer]
    end

    VP -->|scrollX, scrollY, zoom| RD
    RD -->|bootstrapCanvas + renderGrid| SC
    RD -->|bootstrapCanvas| NC
    RD -->|bootstrapCanvas| IC
    IC -->|wheel events| VP
    IC -->|pointer events| VP
```

## Render Pipeline

```mermaid
sequenceDiagram
    participant State as Viewport/Size Change
    participant Dirty as Dirty Flags
    participant RAF as useRafFn Loop
    participant Canvas as Canvas 2D

    State->>Dirty: markAllDirty()
    RAF->>Dirty: check flags each frame
    Dirty->>RAF: staticDirty=true
    RAF->>Canvas: bootstrapCanvas(ctx, dpr, w, h, bgColor)
    RAF->>Canvas: renderGrid(ctx, scroll, zoom)
    RAF->>Dirty: staticDirty=false
```

## Feature-Based Architecture

```mermaid
graph LR
    subgraph "app/"
        Pages[pages/index.vue]
        subgraph "features/"
            Canvas[canvas/]
        end
        subgraph "shared/"
            Math[math.ts]
            Random[random.ts]
        end
    end

    Pages --> Canvas
    Canvas --> Math
    Canvas --> Random
```

### Import Rules

1. **Pages** can import from **features** (pages are top-level orchestrators)
2. **Features** can import from **shared** (zero-dependency utilities)
3. **shared/** imports from nothing — it is dependency-free
4. **components/** and **composables/** (top-level) cannot import from **features/**

## Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Rendering | Native Canvas 2D + roughjs | Hand-drawn aesthetic, Excalidraw format compat |
| Canvas layers | Triple canvas (static/new-element/interactive) | Avoid re-rendering all elements during draw |
| State management | Composables + shallowRef (no Pinia) | Canvas apps need raw performance, no Proxy overhead |
| Reactivity | shallowRef + markRaw for DOM/Canvas APIs | Never proxy CanvasRenderingContext2D |
| SSR | Disabled (ssr: false) | Canvas API is browser-only |
| Render loop | useRafFn + dirty flags | Only re-render when state changes |
| HiDPI | devicePixelRatio scaling in bootstrapCanvas | Crisp rendering on Retina displays |
| Coordinate system | screenToScene / sceneToScreen pure functions | Clean separation of screen vs scene space |
| Auto-imports | Disabled (`imports: { autoImport: false }`) | Explicit imports improve IDE support, make files self-documenting, fix Vitest node-mode compat |
| Testing | Vitest (node + browser projects) | 60% unit / 30% integration / 10% visual — canvas apps need more unit tests |

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
        CT[createTestApp.ts — browser render wrapper]
        subgraph "factories/"
            VF[viewport.ts]
            PF[point.ts]
        end
    end

    UT --> WS
    UT --> VF
    UT --> PF
    BT --> CT
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
- **`withSetup` uses `effectScope`** not `createApp` — works in node mode without `document`
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
            IX[index.ts]
            subgraph "composables/"
                UV[useViewport.ts]
                UR[useRenderer.ts]
            end
            subgraph "components/"
                CC[CanvasContainer.vue]
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
            CTA[createTestApp.ts]
            subgraph "factories/"
                VPF[viewport.ts]
                PTF[point.ts]
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
| Canvas shapes | roughjs | Hand-drawn rendering (Phase 2+) |
| Freedraw | perfect-freehand | Pressure-sensitive strokes (Phase 4+) |
| Composables | VueUse | Events, RAF, element size |
| IDs | nanoid | Element ID generation |
| Math | shared/math.ts | Point/vector utilities |

> **Note:** This map reflects the current state after Phase 1 + testing setup. Update when new features/directories are added.
