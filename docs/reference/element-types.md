# Element Types

| Type        | Model                         | Notes                                                                                                                                                                                         |
| ----------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rectangle` | Box (x, y, width, height)     | Standard shape                                                                                                                                                                                |
| `ellipse`   | Box (x, y, width, height)     | Standard shape                                                                                                                                                                                |
| `diamond`   | Box (x, y, width, height)     | Standard shape                                                                                                                                                                                |
| `arrow`     | Points-based (x, y, points[]) | `points` are relative to `x,y`. First point always `[0,0]`. `width`/`height` derived from points AABB. No rotation handles (Phase 1).                                                         |
| `line`      | Points-based (x, y, points[]) | Same linear model as arrow. No arrowheads, no bindings. Has `polygon` boolean for closed shapes.                                                                                              |
| `code`      | Rectangle + `customData`      | Not a distinct element type — uses `rectangle` with `customData.code` and `customData.language`. Rendered as a code block with syntax highlighting via Shiki. See Code Feature section below. |

## Base Element Fields (`ExcalidrawElementBase`)

All element types share these fields (defined in `elements/types.ts`):

| Field             | Type                               | Notes                                                                                      |
| ----------------- | ---------------------------------- | ------------------------------------------------------------------------------------------ |
| `id`              | `string` (readonly)                | Unique ID via `nanoid`                                                                     |
| `type`            | `ExcalidrawElementType` (readonly) | `'rectangle' \| 'ellipse' \| 'diamond' \| 'arrow' \| 'line' \| 'text'`                     |
| `x`, `y`          | `number`                           | Scene position                                                                             |
| `width`, `height` | `number`                           | Bounding box size                                                                          |
| `angle`           | `number`                           | Rotation in radians                                                                        |
| `strokeColor`     | `string`                           | Default `#1e1e1e`                                                                          |
| `backgroundColor` | `string`                           | Default `transparent`                                                                      |
| `fillStyle`       | `FillStyle`                        | `'hachure' \| 'solid' \| 'cross-hatch' \| 'zigzag' \| 'dots' \| 'dashed' \| 'zigzag-line'` |
| `strokeWidth`     | `number`                           | Default `2`                                                                                |
| `roughness`       | `number`                           | Default `1` (artist)                                                                       |
| `opacity`         | `number`                           | Default `100`                                                                              |
| `seed`            | `number`                           | Deterministic roughjs randomness                                                           |
| `versionNonce`    | `number`                           | Cache invalidation key                                                                     |
| `isDeleted`       | `boolean`                          | Soft-delete flag                                                                           |
| `boundElements`   | `readonly BoundElement[]`          | Which arrows are bound to this element                                                     |
| `groupIds`        | `readonly GroupId[]` (readonly)    | Group membership (empty = ungrouped)                                                       |

## Type Guards (`elements/types.ts`)

Prefer type guard functions over inline `el.type === '...'` checks when the variable is typed as the union `ExcalidrawElement`. The guards narrow the type for downstream code.

| Guard                   | Narrows To                   | Replaces                                                                                     |
| ----------------------- | ---------------------------- | -------------------------------------------------------------------------------------------- |
| `isArrowElement(el)`    | `ExcalidrawArrowElement`     | `el.type === 'arrow'`                                                                        |
| `isLineElement(el)`     | `ExcalidrawLineElement`      | `el.type === 'line'`                                                                         |
| `isTextElement(el)`     | `ExcalidrawTextElement`      | `el.type === 'text'`                                                                         |
| `isLinearElement(el)`   | `ExcalidrawLinearElement`    | `el.type === 'arrow' \|\| el.type === 'line'` (covers both linear types)                     |
| `isBindableElement(el)` | `BindableElement`            | `el.type === 'rectangle' \|\| el.type === 'ellipse' \|\| el.type === 'diamond'`              |
| `isCodeElement(el)`     | `boolean` (not a type guard) | `el.type === 'rectangle' && el.customData?.code !== undefined` (in `features/code/types.ts`) |

**When NOT to use guards:** In exhaustive switch/if-chains that handle every type branch (e.g., `createElement.ts`, `shapeGenerator.ts`, `distanceToShapeEdge`). Those must list types explicitly for `never`-exhaustiveness checks.

`BindableElement` type and `isBindableElement` guard are canonical in `elements/types.ts` and re-exported from `binding/types.ts` for convenience.

## Grouping Feature (`features/groups/`)

Elements can be grouped via `Cmd+G`. Groups are **not** separate entities — they exist as shared `GroupId` strings in the `groupIds` array. V1 supports flat grouping only (0 or 1 group per element).

| File                       | Purpose                                                                                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `types.ts`                 | Re-exports `GroupId` from `elements/types.ts`                                                                                                                      |
| `groupUtils.ts`            | Pure functions: `getOutermostGroupId()`, `getElementsInGroup()`, `addToGroup()`, `removeFromGroups()`, `selectGroupsForSelectedElements()`, `isSelectedViaGroup()` |
| `composables/useGroups.ts` | Composable: `groupSelection()` (Cmd+G), `ungroupSelection()` (Cmd+Shift+G), group-aware selection, editing mode                                                    |
| `groupUtils.unit.test.ts`  | Unit tests for group utility functions                                                                                                                             |
| `index.ts`                 | Barrel exports                                                                                                                                                     |

## Arrow-Specific Architecture

- **Tool types**: `LinearToolType = 'arrow' | 'line'` vs `ShapeToolType = 'rectangle' | 'ellipse' | 'diamond'`. Full: `ToolType = 'selection' | 'hand' | 'text' | 'code' | DrawingToolType`. Guards: `isLinearTool()`, `isShapeTool()`, `isDrawingTool()`, `isTextTool()`, `isCodeTool()`.
- **Drawing**: `useDrawingInteraction` branches on `isLinearTool()` — arrows update `points[]`, shapes update `width/height`. After initial drag, linear tools enter multi-point mode via `onMultiPointStart` callback.
- **Multi-point creation**: `useMultiPointCreation` — after initial 2-point drag, click-to-place additional points. Rubber-band line from last point to cursor. Finalize with Escape/Enter/dblclick or tool switch.
- **Linear editor**: `useLinearEditor` — double-click an existing arrow to edit points. Point handles rendered at vertices, midpoint indicators on segments. Drag to move points, click midpoint to insert, Delete to remove (min 2). Shift-click for multi-select. Escape or click empty space to exit.
- **Point normalization**: `points[0]` always at `(0,0)`. When moved, `element.x/y` shifts and all other points offset to compensate.
- **Rendering**: roughjs `linearPath()` for shaft, Canvas 2D for arrowheads (`arrowhead.ts`). Arrowhead styles: `'arrow'` (V-shape) and `'triangle'` (filled). Interactive overlays (handles, rubber-band) rendered via `renderLinearEditor.ts`.
- **Hit testing**: Point-to-line-segment distance (reuses `distanceToSegment`). Point handle and midpoint handle hit testing via `pointHandles.ts`.
- **Selection**: AABB bounding box, no transform handles. Point handles appear in linear editor mode.
- **Shift-drag**: Snaps to 15-degree increments via `snapAngle()` in `shared/math.ts`.

## Linear Editor Feature (`features/linear-editor/`)

| File                       | Purpose                                                                            |
| -------------------------- | ---------------------------------------------------------------------------------- |
| `constants.ts`             | Handle sizes, colors, thresholds                                                   |
| `types.ts`                 | `MultiPointCreationState`, `LinearEditorState` types                               |
| `pointHandles.ts`          | Pure functions: positions, hit detection, insert/remove/move points, normalization |
| `useMultiPointCreation.ts` | Composable: click-to-place after initial drag, rubber-band preview                 |
| `useLinearEditor.ts`       | Composable: double-click to enter, drag/insert/delete points                       |
| `renderLinearEditor.ts`    | Render point handles, midpoint indicators, rubber-band line                        |
| `index.ts`                 | Barrel exports                                                                     |

## Binding Feature (`features/binding/`)

Arrows attach to shapes via `FixedPointBinding` (elementId + 0-1 ratio on bbox). Moving/resizing a shape automatically updates bound arrow endpoints.

| File                        | Purpose                                                                                                                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `types.ts`                  | Re-exports `BindableElement` and `isBindableElement()` from `elements/types.ts`, defines `BindingEndpoint` (`'start' \| 'end'`)                                          |
| `constants.ts`              | `BASE_BINDING_GAP=5`, `BASE_BINDING_DISTANCE=15`, `MINIMUM_ARROW_SIZE=20`, `BINDING_HIGHLIGHT_LINE_WIDTH=2`, `BINDING_HIGHLIGHT_PADDING=6`, theme-aware `BINDING_COLORS` |
| `proximity.ts`              | `getHoveredElementForBinding()` proximity detection, `distanceToShapeEdge()` per shape type, `computeFixedPoint()` / `getPointFromFixedPoint()` coordinate conversion    |
| `bindUnbind.ts`             | `bindArrowToElement()` — mutates arrow binding + shape boundElements. `unbindArrowEndpoint()` / `unbindArrow()` / `unbindAllArrowsFromShape()`                           |
| `updateBoundPoints.ts`      | `updateBoundArrowEndpoints(shape)` — recalculates all bound arrow positions. `updateArrowEndpoint(arrow, endpoint, target)` — snaps single endpoint to shape edge        |
| `renderBindingHighlight.ts` | `renderSuggestedBinding()` — blue outline (rect/ellipse/diamond aware, rotation aware)                                                                                   |
| `index.ts`                  | Barrel exports                                                                                                                                                           |

**Key types on elements:**

- `ExcalidrawElementBase.boundElements: readonly BoundElement[]` — which arrows are bound to this shape
- `ExcalidrawArrowElement.startBinding/endBinding: FixedPointBinding | null` — which shape each endpoint is bound to
- `FixedPointBinding` stores `readonly elementId: string` and `readonly fixedPoint: readonly [number, number]` (no `mode` field yet — planned for Phase 5 of arrow implementation)

**Integration points:**

- `useDrawingInteraction` — proximity check on pointermove, bind on pointerup, MINIMUM_ARROW_SIZE validation
- `useSelectionInteraction` — update bound arrows on drag/resize/nudge, unbind arrows on whole-arrow drag, unbind before delete
- `useMultiPointCreation` — suggested bindings on pointermove, end binding on finalize
- `useLinearEditor` — suggested bindings when dragging endpoints, bind/unbind on pointerup
- `renderInteractiveScene` — renders suggestedBindings array before selection overlays
- `useSceneRenderer` — passes suggestedBindings through to render callback

## Theme Feature (`features/theme/`)

Dark mode uses programmatic color inversion (`invert(93%) + hue-rotate(180deg)`), matching Excalidraw's approach. No separate dark palette — colors are transformed at render time.

| File                  | Purpose                                                                                                           |
| --------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `types.ts`            | `Theme = 'light' \| 'dark'`, `THEME` constant object                                                              |
| `colors.ts`           | `applyDarkModeFilter()`, `resolveColor(color, theme)` — CSS invert + hue-rotate with browser-only cache           |
| `useTheme.ts`         | `createGlobalState` composable: `theme` (localStorage-persisted), `isDark`, `toggleTheme()`, Alt+Shift+D shortcut |
| `colors.unit.test.ts` | Unit tests for color transformation                                                                               |
| `index.ts`            | Barrel exports                                                                                                    |

**Key constants** (in feature-specific `constants.ts` files, not centralized):

- Selection colors: `SELECTION_COLORS` in `selection/constants.ts` — per-theme colors
- Binding colors: `BINDING_COLORS` in `binding/constants.ts` — per-theme highlight
- Linear editor colors: `LINEAR_EDITOR_COLORS` in `linear-editor/constants.ts` — per-theme point/midpoint/rubber-band colors
- Code element colors: `CODE_THEME_COLORS` in `code/constants.ts` — per-theme bg/header/gutter/text colors

## Code Feature (`features/code/`)

Code elements are rectangles with `customData` containing `{ code: string, language: CodeLanguage }`. They render as styled code blocks with syntax highlighting (Shiki), a macOS-style header bar, line numbers, and a gutter. Supported languages: `'typescript' | 'vue'`.

| File                     | Purpose                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------ |
| `types.ts`               | `CodeElementData`, `CodeLanguage` type, `isCodeElement()` / `getCodeData()` helpers              |
| `constants.ts`           | Font sizes, padding, header dot layout, `CODE_THEME_COLORS` per-theme colors                     |
| `renderCodeElement.ts`   | Canvas 2D rendering: rounded rect bg, header bar, traffic-light dots, line numbers, Shiki tokens |
| `useShikiHighlighter.ts` | Lazy-loads Shiki highlighter, returns `highlight(code, lang, theme)`                             |
| `useCodeInteraction.ts`  | Composable: double-click to edit code, DOM editor overlay, submit on blur/escape                 |
| `buildEditorDom.ts`      | Builds the textarea DOM for code editing                                                         |
| `measureCode.ts`         | Measures code dimensions for auto-sizing                                                         |
| `code.browser.test.ts`   | Browser tests for code element                                                                   |
| `index.ts`               | Barrel exports                                                                                   |

**Integration points:**

- `rendering/shapeGenerator.ts` — skips roughjs shape generation for code elements
- `rendering/renderElement.ts` — calls `renderCodeElement()` for code elements
- `tools/useTextInteraction.ts` — skips text interaction for code elements
- `canvas/CanvasContainer.vue` — manages `editingCodeElement` state and code editor overlay
