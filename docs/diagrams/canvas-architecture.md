# Canvas Architecture

Data flow between the triple canvas stack, composables, and features.

```mermaid
flowchart LR
    subgraph "Triple Canvas Stack + Editor Layer"
        SC[Static Canvas z:1]
        NC[NewElement Canvas z:1]
        IC[Interactive Canvas z:2]
        TEC[textEditorContainer z:3]
    end

    subgraph "Canvas Composables"
        VP[useViewport]
        RD[useRenderer]
        SR[useSceneRenderer]
        PN[usePanning]
        DF2[createDirtyFlags]
        CL[useCanvasLayers]
        AC[useAnimationController]
    end

    subgraph "Domain Features"
        EL[useElements]
        TL[useTool]
        DI[useDrawingInteraction]
        TI[useTextInteraction]
        CI[useCodeInteraction]
        SI[useSelectionInteraction]
        SEL[useSelection]
        MPC[useMultiPointCreation]
        LE[useLinearEditor]
        GR[useGroups]
        TH[useTheme]
    end

    CL -->|"2D ctx + RoughCanvas (onMounted)"| SR
    VP -->|scrollX, scrollY, zoom| SR
    SR -->|onRenderStatic callback| RD
    SR -->|onRenderNewElement callback| RD
    SR -->|onRenderInteractive callback| RD
    RD -->|RAF render| SC
    RD -->|RAF render| NC
    RD -->|RAF render| IC
    TH -->|theme, resolveColor| SR

    IC -->|wheel events| VP
    IC -->|pointer events| PN
    IC -->|pointer events| DI
    IC -->|pointer events| SI
    IC -->|pointer events| MPC
    IC -->|pointer events| LE
    IC -->|pointer events| TI
    IC -->|pointer events| CI
    TEC -->|text input| TI
    TEC -->|code input| CI
    SI -->|select/drag/resize| SEL
    SEL -->|selectedElements| SR
    GR -->|selectedGroupIds| SR
    TL -->|activeTool| SI
    TL -->|activeTool| PN
    TL -->|activeTool| DI
    TL -->|activeTool| TI
    TL -->|activeTool| CI
    DI -->|newElement| SR
    DI -->|onElementCreated| EL
    EL -->|elements| SR
    MPC -->|multiElement, lastCursorPoint| SR
    LE -->|editingElement, pointIndices, hoveredMidpoint| SR
    TI -->|editingTextElement| SR
    CI -->|editingCodeElement| SR
    AC -->|markInteractiveDirty per tick| RD
```

## Layer Responsibilities

| Canvas | z-index | Pointer Events | Renders |
|--------|---------|----------------|---------|
| **Static** | 1 | None | Grid dots + all committed elements (roughjs) |
| **NewElement** | 1 | None | Single in-progress shape during drawing |
| **Interactive** | 2 | All pointer/wheel | Selection borders, handles, group borders, linear editor overlays, binding highlights, marquee box |
| **textEditorContainer** | 3 | None (pointer-events-none) | Overlay div for text/code editing DOM elements |

## useSceneRenderer Orchestration

`useSceneRenderer` is the bridge between domain state and the render loop. It:
1. Accepts all domain refs (elements, selection, newElement, linear editor state, groups, bindings, editingTextElement, editingCodeElement)
2. Calls `useTheme()` to get the current theme
3. Calls `useRenderer()` with three render callbacks that read domain state
4. Calls `useAnimationController()` for keyed RAF animations
5. Watches `selectedIds` and `theme` to mark dirty flags
6. Returns `mark*Dirty` functions for the deferred dirty-flag pattern
