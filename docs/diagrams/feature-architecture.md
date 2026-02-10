# Feature-Based Architecture

Feature directory layout and inter-feature dependency graph.

```mermaid
graph LR
    subgraph "app/"
        Pages[pages/index.vue]
        subgraph "features/"
            Canvas[canvas/]
            Elements[elements/]
            Rendering[rendering/]
            Tools[tools/]
            Selection[selection/]
            LinearEditor[linear-editor/]
            Binding[binding/]
            Code[code/]
            Theme[theme/]
            Groups[groups/]
        end
        subgraph "shared/"
            Math[math.ts]
            Random[random.ts]
            IsTyping[isTypingElement.ts]
        end
    end

    Pages --> Canvas
    Canvas --> Elements
    Canvas --> Rendering
    Canvas --> Tools
    Canvas --> Selection
    Canvas --> LinearEditor
    Canvas --> Binding
    Canvas --> Code
    Canvas --> Theme
    Canvas --> Groups
    Tools --> Elements
    Tools --> Binding
    Tools --> Code
    Rendering --> Elements
    Rendering --> Theme
    Rendering --> Selection
    Rendering --> LinearEditor
    Rendering --> Binding
    Rendering --> Code
    LinearEditor --> Elements
    LinearEditor --> Binding
    Binding --> Elements
    Code --> Elements
    Code --> Rendering
    LinearEditor --> Binding
    Selection --> Elements
    Groups --> Elements
    Canvas --> Math
    Canvas --> Random
    Elements --> Random
    Rendering --> Math
```

## Import Rules

1. **Pages** can import from **features** (pages are top-level orchestrators)
2. **Features** can import from **shared** (zero-dependency utilities)
3. **Features** can import from **other features** (canvas orchestrates elements, rendering, tools, selection, etc.)
4. **shared/** imports from nothing -- it is dependency-free
5. **components/** and **composables/** (top-level) cannot import from **features/**

## Feature Summary

| Feature | Purpose | Key Exports |
|---------|---------|-------------|
| **canvas** | Canvas stack, viewport, render loop, dirty flags, scene orchestration | `useViewport`, `useRenderer`, `useSceneRenderer`, `useCanvasLayers`, `usePanning`, `createDirtyFlags`, `useAnimationController` |
| **elements** | Element data model, creation, mutation | `useElements`, `createElement`, `mutateElement` |
| **rendering** | Grid, shape generation, scene/element/interactive rendering, text measurement | `renderGrid`, `renderScene`, `renderElement`, `generateShape`, `textMeasurement` |
| **tools** | Tool state, drawing interaction, text editing interaction | `useToolStore`, `useDrawingInteraction`, `useTextInteraction` |
| **selection** | Hit testing, bounds, drag/resize, selection state machine | `useSelection`, `useSelectionInteraction`, `hitTest`, `dragElements`, `resizeElement` |
| **linear-editor** | Multi-point arrow creation, point editing | `useMultiPointCreation`, `useLinearEditor`, `pointHandles` |
| **binding** | Arrow-to-shape binding, proximity detection, bound text | `bindArrowToElement`, `proximity`, `updateBoundPoints`, `renderSuggestedBinding`, `boundText` |
| **code** | Code element with syntax highlighting via Shiki | `useCodeInteraction`, `useShikiHighlighter`, `renderCodeElement`, `buildEditorDom`, `measureCode` |
| **theme** | Light/dark mode, color resolution | `useTheme`, `resolveColor`, `applyDarkModeFilter` |
| **groups** | Element grouping, group selection expansion | `useGroups`, `groupUtils` (pure functions), `cleanupAfterDelete` |
