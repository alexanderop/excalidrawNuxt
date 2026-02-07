# System Knowledge Map

## Architecture Overview

```mermaid
graph TD
    A[Nuxt 4 App] --> B[Vue 3 Components]
    B --> C[ExcalidrawWrapper.client.vue]
    C --> D[React-in-Vue Bridge]
    D --> E[Excalidraw React Component]
    E --> F[Canvas / SVG Rendering]

    A --> G[SSR / Nitro Server]
    G -.->|"skipped (client-only)"| C

    style C fill:#f9a825,color:#000
    style D fill:#ef6c00,color:#fff
    style E fill:#1565c0,color:#fff
```

## React-in-Vue Bridge

```mermaid
sequenceDiagram
    participant Vue as Vue Component
    participant Ref as DOM Ref Element
    participant React as React Root
    participant Ex as Excalidraw

    Vue->>Ref: onMounted → get DOM element
    Vue->>React: createRoot(element)
    React->>Ex: render(<Excalidraw />)
    Ex-->>Vue: excalidrawAPI callback
    Vue->>Vue: store API in shallowRef
```

## Data Flow

```mermaid
flowchart LR
    subgraph Client
        UI[Vue UI] <-->|props/events| Bridge[React Bridge]
        Bridge <-->|API calls| Excalidraw
        Excalidraw -->|scene data| Serialize[serializeAsJSON]
    end

    Serialize -->|JSON| Storage[(Persistence)]
    Storage -->|JSON| Deserialize[loadFromJSON]
    Deserialize --> Excalidraw
```

## Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| React integration | React-in-Vue bridge | Excalidraw is React-only, no Vue port exists |
| SSR strategy | Client-only for Excalidraw | Canvas/DOM APIs unavailable in SSR |
| API storage | `shallowRef` | Deep reactivity on Excalidraw API destroys performance |
| Serialization | `serializeAsJSON` | Handles circular refs in scene elements |

## File Map

```mermaid
graph LR
    subgraph Root
        NC[nuxt.config.ts]
        PK[package.json]
    end

    subgraph "app/"
        AV[app.vue]
        subgraph "components/"
            EW[ExcalidrawWrapper.client.vue]
        end
        subgraph "composables/"
            UE[useExcalidraw.ts]
        end
    end

    subgraph "docs/ — Agent Memory"
        SK[SYSTEM_KNOWLEDGE_MAP.md]
        EG[excalidraw-gotchas.md]
        NG[nuxt-gotchas.md]
    end
```

> **Note:** This map reflects the target structure. Files are added as features are built. Update this diagram when new directories or key files are introduced.
