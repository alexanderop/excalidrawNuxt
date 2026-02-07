# Element Types

| Type | Model | Notes |
|------|-------|-------|
| `rectangle` | Box (x, y, width, height) | Standard shape |
| `ellipse` | Box (x, y, width, height) | Standard shape |
| `diamond` | Box (x, y, width, height) | Standard shape |
| `arrow` | Points-based (x, y, points[]) | `points` are relative to `x,y`. First point always `[0,0]`. `width`/`height` derived from points AABB. No rotation handles (Phase 1). |

## Arrow-Specific Architecture

- **Tool types**: `LinearToolType = 'arrow'` vs `ShapeToolType = 'rectangle' | 'ellipse' | 'diamond'`. Guards: `isLinearTool()`, `isShapeTool()`.
- **Drawing**: `useDrawingInteraction` branches on `isLinearTool()` — arrows update `points[]`, shapes update `width/height`. After initial drag, linear tools enter multi-point mode via `onMultiPointStart` callback.
- **Multi-point creation**: `useMultiPointCreation` — after initial 2-point drag, click-to-place additional points. Rubber-band line from last point to cursor. Finalize with Escape/Enter/dblclick or tool switch.
- **Linear editor**: `useLinearEditor` — double-click an existing arrow to edit points. Point handles rendered at vertices, midpoint indicators on segments. Drag to move points, click midpoint to insert, Delete to remove (min 2). Shift-click for multi-select. Escape or click empty space to exit.
- **Point normalization**: `points[0]` always at `(0,0)`. When moved, `element.x/y` shifts and all other points offset to compensate.
- **Rendering**: roughjs `linearPath()` for shaft, Canvas 2D for arrowheads (`arrowhead.ts`). Arrowhead styles: `'arrow'` (V-shape) and `'triangle'` (filled). Interactive overlays (handles, rubber-band) rendered via `renderLinearEditor.ts`.
- **Hit testing**: Point-to-line-segment distance (reuses `distanceToSegment`). Point handle and midpoint handle hit testing via `pointHandles.ts`.
- **Selection**: AABB bounding box, no transform handles. Point handles appear in linear editor mode.
- **Shift-drag**: Snaps to 15-degree increments via `snapAngle()` in `shared/math.ts`.

## Linear Editor Feature (`features/linear-editor/`)

| File | Purpose |
|------|---------|
| `constants.ts` | Handle sizes, colors, thresholds |
| `types.ts` | `MultiPointCreationState`, `LinearEditorState` types |
| `pointHandles.ts` | Pure functions: positions, hit detection, insert/remove/move points, normalization |
| `useMultiPointCreation.ts` | Composable: click-to-place after initial drag, rubber-band preview |
| `useLinearEditor.ts` | Composable: double-click to enter, drag/insert/delete points |
| `renderLinearEditor.ts` | Render point handles, midpoint indicators, rubber-band line |
| `index.ts` | Barrel exports |

## Binding Feature (`features/binding/`)

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
