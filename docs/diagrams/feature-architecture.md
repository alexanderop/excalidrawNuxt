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

## Import Rules

1. **Pages** can import from **features** (pages are top-level orchestrators)
2. **Features** can import from **shared** (zero-dependency utilities)
3. **Features** can import from **other features** (canvas orchestrates elements, rendering, tools)
4. **shared/** imports from nothing — it is dependency-free
5. **components/** and **composables/** (top-level) cannot import from **features/**
