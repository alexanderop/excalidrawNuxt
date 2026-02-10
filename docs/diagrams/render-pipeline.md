# Render Pipeline

Dirty-flag driven RAF loop: viewport/size/theme changes mark flags, RAF checks each frame, renders only dirty canvases.

## Layer Rendering Flow

```mermaid
sequenceDiagram
    participant State as State Change<br/>(viewport/size/theme/interaction)
    participant Dirty as Dirty Flags<br/>(staticDirty, newElementDirty, interactiveDirty)
    participant RAF as useRenderer RAF Loop
    participant Canvas as Canvas 2D + RoughCanvas

    State->>Dirty: markStaticDirty() / markInteractiveDirty() / markAllDirty()
    RAF->>Dirty: check flags each frame
    alt staticDirty
        Dirty->>RAF: staticDirty=true
        RAF->>Canvas: bootstrapCanvas(ctx, dpr, w, h, bgColor)
        RAF->>Canvas: onRenderStatic → renderGrid + renderScene
        RAF->>Dirty: staticDirty=false
    end
    alt newElementDirty
        Dirty->>RAF: newElementDirty=true
        RAF->>Canvas: bootstrapCanvas(ctx, dpr, w, h) [transparent]
        RAF->>Canvas: onRenderNewElement → renderElement(newElement)
        RAF->>Dirty: newElementDirty=false
    end
    alt interactiveDirty
        Dirty->>RAF: interactiveDirty=true
        RAF->>Canvas: bootstrapCanvas(ctx, dpr, w, h) [transparent]
        RAF->>Canvas: onRenderInteractive → renderInteractiveScene
        RAF->>Dirty: interactiveDirty=false
    end
```

## Static Layer Pipeline

```mermaid
flowchart LR
    A[onRenderStatic] --> B[renderGrid]
    B --> B1[resolveColor for grid dots based on theme]
    B --> B2[Dot grid with zoom fade]
    A --> C[renderScene]
    C --> C1[Viewport culling via getElementBounds]
    C --> C2[renderElement per visible element]
    C2 --> C3[generateShape via roughjs + cache]
    C2 --> C4[resolveColor for stroke/fill based on theme]
    C --> C5[renderCodeElement for code elements]
    C --> C6[textMeasurement for text metrics]
```

## Interactive Layer Pipeline

```mermaid
flowchart LR
    A[onRenderInteractive] --> B[renderInteractiveScene]
    B --> C[renderSuggestedBinding - blue highlights]
    B --> D[renderSelectedElements]
    D --> D1[Per-element: renderSelectionBorder + renderTransformHandles]
    D --> D2[Per-group: renderGroupSelectionBorder]
    B --> E[renderSelectionBox - marquee]
    B --> F[renderLinearEditorOverlays]
    F --> F1[renderSelectionBorder for editing arrow]
    F --> F2[renderPointHandles]
    F --> F3[renderMidpointIndicator]
    B --> G[renderRubberBand - multi-point creation preview]
```

## What Triggers Dirty Flags

| Trigger | Flag(s) | Source |
|---------|---------|-------|
| `watch([width, height, scrollX, scrollY, zoom, bgColor])` | All three | `useRenderer` |
| `watch(theme)` | All three (`markAllDirty`) | `useSceneRenderer` |
| `watch(visibility)` (tab becomes visible) | All three | `useRenderer` |
| `watch(selectedIds)` | Interactive | `useSceneRenderer` |
| Element created/mutated | Static | interaction composables |
| New element drag | NewElement | `useDrawingInteraction` |
| Selection change/drag/resize | Interactive | `useSelectionInteraction` |
| Group/ungroup | Static + Interactive | `useGroups` |
| Linear editor point move | Static + Interactive | `useLinearEditor` |
| Text editing submit | Static + Interactive | `useTextInteraction` |
| Code editing submit | Static + Interactive | `useCodeInteraction` |
| Animation tick | Interactive | `useAnimationController` |

## Theme Integration

`useSceneRenderer` calls `useTheme()` and computes `bgColor = resolveColor('#ffffff', theme)`. The theme ref is passed through to:
- `renderGrid(ctx, ..., theme)` -- resolves grid dot color
- `renderScene(ctx, ..., theme)` -- each element's stroke/fill resolved
- `renderInteractiveScene(ctx, ..., theme)` -- selection colors from `SELECTION_COLORS[theme]`
- `renderElement(ctx, rc, el, theme)` -- individual element color resolution

A `watch(theme, markAllDirty)` ensures all three canvases repaint when theme changes.
