# Initialization Sequence

How `CanvasContainer.vue` boots: composable call order, the deferred dirty-flag pattern, and what runs in `setup()` vs `onMounted()`.

## The Circular Dependency Problem

The canvas initialization has a chicken-and-egg problem:

1. **Drawing/selection composables** need `markStaticDirty()` / `markInteractiveDirty()` to schedule repaints when the user interacts.
2. **`useSceneRenderer`** produces those `mark*Dirty` functions, but it needs access to `newElement`, `selectionBox`, and other refs that come _from_ the drawing/selection composables.
3. You cannot call `useSceneRenderer` first (it needs drawing refs) and you cannot call drawing composables first (they need dirty callbacks).

## The Deferred Dirty-Flag Solution

`createDirtyFlags()` breaks the cycle by returning **stable function references** that delegate to internal `noop` closures. Drawing composables receive these immediately. After `useSceneRenderer` produces the real `mark*Dirty` functions, `dirty.bind()` swaps the noops for real callbacks. Any calls made before `bind()` are silently dropped (no-ops), which is fine because no rendering can happen before the renderer exists.

```
createDirtyFlags()          ─── returns { markStaticDirty, markInteractiveDirty, markNewElementDirty, bind }
                                 internally: _static = noop, _interactive = noop, _newElement = noop

useDrawingInteraction(...)  ─── receives dirty.markNewElementDirty (currently a noop wrapper)
useSelectionInteraction(...)─── receives dirty.markStaticDirty / markInteractiveDirty (noop wrappers)

useSceneRenderer(...)       ─── returns REAL mark*Dirty functions (backed by useRenderer's RAF loop)

dirty.bind({ markStaticDirty, markInteractiveDirty, markNewElementDirty })
                                 swaps noops → real callbacks; all prior references now call through
```

## Full Boot Sequence

```mermaid
sequenceDiagram
    participant Component as CanvasContainer setup()
    participant Viewport as useViewport
    participant Elements as useElements
    participant Tools as useToolStore
    participant Selection as useSelection
    participant Layers as useCanvasLayers
    participant DirtyFlags as createDirtyFlags
    participant Panning as usePanning
    participant MultiPt as useMultiPointCreation
    participant LinEdit as useLinearEditor
    participant Drawing as useDrawingInteraction
    participant SelInt as useSelectionInteraction
    participant SceneR as useSceneRenderer
    participant Renderer as useRenderer
    participant DOM as Browser DOM

    Note over Component: ── setup() phase (synchronous) ──

    Component->>Viewport: useViewport()
    Viewport-->>Component: scrollX, scrollY, zoom, panBy, zoomBy, toScene

    Component->>Elements: useElements()
    Elements-->>Component: elements, addElement

    Component->>Tools: useToolStore()
    Tools-->>Component: activeTool, setTool, onBeforeToolChange

    Component->>Selection: useSelection(elements)
    Selection-->>Component: selectedIds, selectedElements, select, clearSelection, ...

    Component->>Layers: useCanvasLayers(canvasRefs)
    Note over Layers: Returns null shallowRefs<br/>Registers onMounted() internally
    Layers-->>Component: staticCtx, newElementCtx, interactiveCtx, staticRc, newElementRc (all null)

    Component->>DirtyFlags: createDirtyFlags()
    Note over DirtyFlags: _static = noop<br/>_interactive = noop<br/>_newElement = noop
    DirtyFlags-->>Component: markStaticDirty (noop), markInteractiveDirty (noop), markNewElementDirty (noop), bind()

    Component->>Panning: usePanning(canvasRef, panBy, zoomBy, activeTool)
    Panning-->>Component: cursorClass, spaceHeld, isPanning

    Component->>MultiPt: useMultiPointCreation(shared + dirty.mark*)
    Note over MultiPt: Receives noop dirty wrappers
    MultiPt-->>Component: multiElement, lastCursorPoint, finalizeMultiPoint

    Component->>LinEdit: useLinearEditor(shared + dirty.mark*)
    Note over LinEdit: Receives noop dirty wrappers
    LinEdit-->>Component: editingLinearElement, editingPointIndices, ...

    Component->>Drawing: useDrawingInteraction(shared + dirty.mark*)
    Note over Drawing: Receives noop dirty wrappers
    Drawing-->>Component: newElement

    Component->>SelInt: useSelectionInteraction(shared + dirty.mark*)
    Note over SelInt: Receives noop dirty wrappers
    SelInt-->>Component: selectionBox, cursorStyle

    Component->>SceneR: useSceneRenderer(layers, viewport, elements, newElement, selectionBox, ...)
    SceneR->>Renderer: useRenderer(layers, viewport, renderCallbacks)
    Note over Renderer: Creates RAF loop<br/>staticDirty = true (initial)<br/>watch([width, height, scroll*, zoom]) → markAllDirty
    Renderer-->>SceneR: REAL markStaticDirty, markNewElementDirty, markInteractiveDirty
    SceneR-->>Component: REAL mark*Dirty functions

    Component->>DirtyFlags: dirty.bind({ markStaticDirty, markInteractiveDirty, markNewElementDirty })
    Note over DirtyFlags: _static = REAL markStaticDirty<br/>_interactive = REAL markInteractiveDirty<br/>_newElement = REAL markNewElementDirty<br/>All prior noop wrappers now delegate to real functions

    Note over Component: ── setup() complete ──

    Note over Component,DOM: ── onMounted() phase ──

    DOM->>Layers: onMounted fires
    Note over Layers: canvas refs now point to real DOM elements
    Layers->>Layers: initCanvasContext(static) → staticCtx.value = ctx
    Layers->>Layers: initCanvasContext(newElement) → newElementCtx.value = ctx
    Layers->>Layers: initCanvasContext(interactive) → interactiveCtx.value = ctx
    Layers->>Layers: initRoughCanvas(static) → staticRc.value = rc
    Layers->>Layers: initRoughCanvas(newElement) → newElementRc.value = rc

    Note over Renderer: ctx refs populated triggers first render cycle
    Renderer->>Renderer: scheduleRender() via RAF
    Renderer->>DOM: bootstrapCanvas() + onRenderStatic() → grid + scene
    Note over DOM: First frame painted
```

## Phase Summary

| Phase | What happens | Key detail |
|-------|-------------|------------|
| **setup() - early** | `useViewport`, `useElements`, `useToolStore`, `useSelection` | Pure reactive state, no DOM needed |
| **setup() - canvas layers** | `useCanvasLayers(canvasRefs)` | Returns `null` shallowRefs; registers internal `onMounted` hook |
| **setup() - dirty flags** | `createDirtyFlags()` | Returns stable noop wrappers; breaks circular dependency |
| **setup() - interactions** | `usePanning`, `useMultiPointCreation`, `useLinearEditor`, `useDrawingInteraction`, `useSelectionInteraction` | All receive noop dirty wrappers via `shared` object |
| **setup() - renderer** | `useSceneRenderer` calls `useRenderer` | Creates RAF loop, returns real `mark*Dirty` functions |
| **setup() - bind** | `dirty.bind(realCallbacks)` | Swaps noops for real callbacks; all composables now trigger real repaints |
| **onMounted()** | `useCanvasLayers` internal hook | Gets 2D contexts + RoughCanvas from real DOM elements |
| **First frame** | RAF fires, `staticDirty=true` | Renders grid + scene on static canvas |
