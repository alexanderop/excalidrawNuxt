# Shape Drawing Flow

Pointer event sequence for creating shapes (rectangle, ellipse, diamond) and arrows.

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

## Text Element Creation Flow

```mermaid
sequenceDiagram
    participant User as User Input
    participant TI as useTextInteraction
    participant EL as createElement/mutateElement
    participant TEC as textEditorContainer

    User->>TI: pointerdown (text tool active, or dblclick on text)
    TI->>EL: createElement('text', sceneX, sceneY)
    TI->>TEC: mount textarea DOM editor
    Note over TI: editingTextElement set

    User->>TEC: type text content
    TI->>EL: mutateElement(el, {text, width, height})

    User->>TI: click outside / Escape / tool change
    TI->>TI: submitTextEditor()
    TI->>TEC: remove textarea DOM
    TI->>TI: markStaticDirty()
```

## Code Element Creation Flow

```mermaid
sequenceDiagram
    participant User as User Input
    participant CI as useCodeInteraction
    participant EL as createElement/mutateElement
    participant TEC as textEditorContainer
    participant SH as useShikiHighlighter

    User->>CI: pointerdown (code tool active, or dblclick on code)
    CI->>EL: createElement('code', sceneX, sceneY)
    CI->>TEC: mount code editor DOM (buildEditorDom)
    CI->>SH: load Shiki highlighter
    Note over CI: editingCodeElement set

    User->>TEC: type code content
    CI->>EL: mutateElement(el, {code, width, height})
    CI->>SH: syntax highlight on change

    User->>CI: click outside / Escape / tool change
    CI->>CI: submitCodeEditor()
    CI->>TEC: remove code editor DOM
    CI->>CI: markStaticDirty()
```
