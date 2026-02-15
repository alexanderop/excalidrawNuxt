# Coordinate System

How screen pixels map to scene coordinates through the viewport transform.

## Spaces Overview

```mermaid
flowchart LR
    subgraph "Screen Space (pixels)"
        SP["Mouse/pointer position<br/>Canvas pixel coordinates<br/>(0,0) = top-left of canvas"]
    end

    subgraph "Viewport Transform"
        VT["scrollX, scrollY, zoom<br/>Managed by useViewport"]
    end

    subgraph "Scene Space (world)"
        SS["Element positions<br/>Infinite 2D plane<br/>Zoom-independent"]
    end

    SP -->|screenToScene| SS
    SS -->|sceneToScreen| SP
    SP <-->|viewport| VT
    VT <-->|viewport| SS
```

## Transform Formulas

From `packages/core/src/features/canvas/coords.ts`:

```
screenToScene(screenX, screenY, viewport):
  sceneX = screenX / zoom - scrollX
  sceneY = screenY / zoom - scrollY

sceneToScreen(sceneX, sceneY, viewport):
  screenX = (sceneX + scrollX) * zoom
  screenY = (sceneY + scrollY) * zoom
```

These are exact inverses: `sceneToScreen(screenToScene(x, y, v), v) === {x, y}`.

## Data Flow: Input to Scene

```mermaid
flowchart TD
    PE[Pointer Event on Interactive Canvas] -->|"event.offsetX, event.offsetY"| STS["screenToScene()"]
    STS -->|"scene {x, y}"| HIT[Hit Testing]
    STS -->|"scene {x, y}"| CREATE[Element Creation]
    STS -->|"scene {x, y}"| DRAG[Drag / Resize]

    HIT --> SEL[useSelection]
    CREATE --> EL[useElements]
    DRAG --> EL
```

## Data Flow: Scene to Render

```mermaid
flowchart TD
    EL["Element scene coords<br/>(x, y, width, height)"] -->|sceneToScreen| PX[Pixel position on canvas]
    PX --> DRAW["canvas.fillRect() / strokeRect()"]

    VP["useViewport<br/>scrollX, scrollY, zoom"] -->|"ctx.setTransform(zoom, 0, 0, zoom, scrollX*zoom, scrollY*zoom)"| CTX[Canvas 2D Context]
    CTX --> DRAW
```

## Viewport Operations

From `packages/core/src/features/canvas/composables/useViewport.ts`:

| Operation                  | Formula                                                            | Description                                     |
| -------------------------- | ------------------------------------------------------------------ | ----------------------------------------------- |
| `panBy(dx, dy)`            | `scrollX += dx / zoom`<br/>`scrollY += dy / zoom`                  | Pan converts screen-pixel deltas to scene units |
| `zoomTo(newZoom, center?)` | Clamp to `[0.1, 30]`, recompute scroll to keep center point stable | Zoom anchored to a screen point                 |
| `zoomBy(delta, center?)`   | `zoomTo(zoom * (1 + delta), center)`                               | Relative zoom (e.g. wheel scroll)               |

## Zoom-Anchored Scroll Adjustment

When zooming to a center point, the viewport keeps that scene point stationary on screen:

```
scenePoint = screenToScene(center.x, center.y, currentViewport)
scrollX = center.x / newZoom - scenePoint.x
scrollY = center.y / newZoom - scenePoint.y
```

This ensures the point under the cursor stays fixed during pinch/scroll zoom.
