# Arrow Parity Spec — Matching Excalidraw's Arrow UX

> Goal: make our arrows behave identically to Excalidraw's arrows.
> Reference: `walkthrough-arrow-ux.html` (full Excalidraw source analysis)

---

## Current State (what we have)

> **Note:** Element types are re-exported from `@excalidraw/element/types` (official package), not custom-defined. Properties like `elbowed`, `strokeStyle`, `roundness`, `groupIds` already exist on the official types. Our `createElement.ts` sets sensible defaults.

| Feature                                        | Status  | File(s)                                                                         |
| ---------------------------------------------- | ------- | ------------------------------------------------------------------------------- |
| Arrow element type (`type: "arrow"`)           | Done    | `elements/types.ts` (re-export from `@excalidraw/element/types`)                |
| Line element type (`type: "line"`)             | Done    | `elements/types.ts`, `elements/createElement.ts`                                |
| Point array (local coords, first=[0,0])        | Done    | `elements/types.ts`, `linear-editor/pointHandles.ts`                            |
| Arrow creation (click-drag)                    | Done    | `tools/useDrawingInteraction.ts`                                                |
| Line creation (click-drag + multi-point)       | Done    | `tools/useDrawingInteraction.ts` (shares arrow infra)                           |
| Multi-point creation (click-to-place)          | Done    | `linear-editor/useMultiPointCreation.ts`                                        |
| Shift-constrained angle snap (15deg)           | Done    | `tools/useDrawingInteraction.ts`, `shared/math.ts`                              |
| Finalize via Escape/Enter/dblclick             | Done    | `linear-editor/useMultiPointCreation.ts`                                        |
| Linear editor (double-click to edit)           | Done    | `linear-editor/useLinearEditor.ts`                                              |
| Point handles (select, drag, Shift-multi)      | Done    | `linear-editor/useLinearEditor.ts`                                              |
| Midpoint insertion (hover + click)             | Done    | `linear-editor/pointHandles.ts`                                                 |
| Point deletion (Delete/Backspace)              | Done    | `linear-editor/useLinearEditor.ts`                                              |
| Arrowhead rendering (arrow, triangle)          | Partial | `rendering/arrowhead.ts`                                                        |
| Rubber-band preview (multi-point)              | Done    | `linear-editor/renderLinearEditor.ts`                                           |
| Selection border for arrows                    | Done    | `rendering/renderInteractive.ts`                                                |
| Hit testing (segment distance)                 | Done    | `selection/hitTest.ts`                                                          |
| 3-layer canvas (static/newElement/interactive) | Done    | `canvas/composables/useCanvasLayers.ts`                                         |
| Roughjs rendering                              | Done    | `rendering/shapeGenerator.ts`                                                   |
| Binding system (arrows attach to shapes)       | Done    | `binding/proximity.ts`, `binding/bindUnbind.ts`, `binding/updateBoundPoints.ts` |
| Bound element back-references                  | Done    | `elements/types.ts` (`boundElements`), `binding/bindUnbind.ts`                  |
| Suggested binding highlight                    | Done    | `binding/renderBindingHighlight.ts`                                             |
| Minimum arrow size threshold (20px)            | Done    | `binding/constants.ts` (`MINIMUM_ARROW_SIZE`)                                   |
| Bound text for shapes                          | Done    | `binding/boundText.ts`, `tools/useTextInteraction.ts`                           |
| Dark mode for canvas + overlays                | Done    | `theme/colors.ts`, `theme/useTheme.ts`                                          |
| Grouping support (`groupIds`)                  | Done    | `groups/groupUtils.ts`, `groups/composables/useGroups.ts`                       |
| Binding in linear editor (endpoint drag)       | Done    | `linear-editor/useLinearEditor.ts` (arrows only, not lines)                     |

## Gap Analysis (what's missing)

> **Note (updated 2026-02):** Binding system (P0 items 1-4) is now **DONE**. The `BindMode` concept (`'inside' | 'orbit' | 'skip'`) exists in Excalidraw's internal source but is **NOT exposed in the official `@excalidraw/element/types` npm package**. Our `FixedPointBinding` from the official package has `elementId`, `focus`, `gap`, and `fixedPoint` (no `mode` field). Binding modes are deferred until the official package adds support or we decide to extend the type ourselves. See `arrow-implementation-plan.md` Phase 1.5 for details.

### P0 — Core Arrow Behavior — DONE

#### 1. Binding System (arrows attach to shapes) — DONE

**Implemented in:** `features/binding/` — proximity detection, bind/unbind, update on move, suggested binding highlight.

**Actual data model (from `@excalidraw/element/types`):**

```ts
// All types re-exported from @excalidraw/element/types — not custom-defined

// FixedPointBinding extends PointBinding with fixedPoint:
type PointBinding = { elementId: string; focus: number; gap: number };
type FixedPointBinding = PointBinding & { fixedPoint: [number, number] };

// ExcalidrawArrowElement (simplified for illustration):
// - startBinding/endBinding: PointBinding | null (FixedPointBinding for elbow)
// - startArrowhead/endArrowhead: Arrowhead | null
// - elbowed: boolean
// - points: readonly LocalPoint[]
// See official @excalidraw/element/types for full definition
```

**Implemented behavior:**

- Proximity detection: `getHoveredElementForBinding()` in `binding/proximity.ts` — `BASE_BINDING_DISTANCE=15`
- Binding gap: `BASE_BINDING_GAP=5` in `binding/constants.ts`
- Bidirectional references: arrow stores `startBinding`/`endBinding`, shape stores `boundElements[]`
- On shape move/resize: `updateBoundArrowEndpoints()` in `binding/updateBoundPoints.ts`
- On arrow finalize: `bindArrowToElement()` in `binding/bindUnbind.ts`
- Binding in linear editor: endpoint drag rebinds (arrows only, lines skip binding)
- Bound text: `bindTextToContainer()`, `unbindTextFromContainer()`, etc. in `binding/boundText.ts`
- **NOT yet implemented:** orbit/inside/skip binding modes (not in official types), Alt/Ctrl modifiers, zoom-adjusted binding distance

**Implemented files:**

- `features/binding/types.ts` — `BindableElement`, `BindingEndpoint`, `isBindableElement()`
- `features/binding/constants.ts` — gap, distance, highlight constants
- `features/binding/proximity.ts` — proximity detection, edge distance, fixed point conversion
- `features/binding/bindUnbind.ts` — bind/unbind lifecycle
- `features/binding/updateBoundPoints.ts` — recalculate arrow endpoints on shape move
- `features/binding/renderBindingHighlight.ts` — suggested binding highlight
- `features/binding/boundText.ts` — bound text lifecycle (bind, unbind, delete, reposition)

#### 2. Bound Element Back-References — DONE

Implemented in `ExcalidrawElementBase.boundElements: readonly BoundElement[]`. Managed by `bindUnbind.ts`.

#### 3. Suggested Binding Preview — DONE

Implemented via `renderSuggestedBinding()` in `binding/renderBindingHighlight.ts`. Theme-aware highlight colors in `BINDING_COLORS`.

#### 4. Minimum Arrow Size Threshold — DONE

`MINIMUM_ARROW_SIZE = 20` in `binding/constants.ts`. Applied during arrow creation finalization.

---

### P1 — Arrow Subtypes

#### 5. Arrow Type Variants (sharp / round / elbow)

**What Excalidraw does:** Three subtypes cycled via pressing `A` repeatedly:

- Sharp: `roundness: null, elbowed: false` — straight line segments
- Round (default): `roundness: { type: 2 }, elbowed: false` — bezier curves
- Elbow: `roundness: null, elbowed: true` — orthogonal A\* routing

> **Data model note (updated):** The official `@excalidraw/element/types` already includes `roundness`, `elbowed`, and `strokeStyle` on the element types. Our `createElement.ts` already sets `elbowed: false`, `roundness: null`, and `strokeStyle: 'solid'` as defaults. No custom `ArrowSubtype` type is needed -- the subtype is determined by the combination of `roundness` and `elbowed` fields, matching Excalidraw's approach. The tool cycling logic and rendering changes are what remain TODO.

**Data model changes:**

```ts
// NO new type needed -- use existing fields from @excalidraw/element/types:
// roundness: null | { type: 2; value?: number }  -- already on element
// elbowed: boolean  -- already on arrow element
// strokeStyle: 'solid' | 'dashed' | 'dotted'  -- already on element
```

**Tool cycling:** Modify `useTool.ts` so pressing `A` when already on `arrow` tool cycles subtypes:

```
sharp → round → elbow → sharp
```

**Rendering impact:**

- Sharp: current roughjs line rendering (what we have now)
- Round: bezier curve fitting through points (new path generation)
- Elbow: orthogonal-only routing (Phase 3 — see below)

#### 6. Extended Arrowhead Types

**What Excalidraw does:** 12 arrowhead styles. We have 3 (`arrow`, `triangle`, `none`).

**Data model change:**

```ts
type ArrowheadType =
  | "arrow" // open chevron (default end)
  | "bar" // perpendicular line
  | "circle" // filled circle
  | "circle_outline" // outlined circle
  | "triangle" // filled triangle
  | "triangle_outline" // outlined triangle
  | "diamond" // filled diamond
  | "diamond_outline" // outlined diamond
  | "crowfoot_one" // ERD: one
  | "crowfoot_many" // ERD: many (crow's foot)
  | "crowfoot_one_or_many"; // ERD: one-or-many
```

**Where:** Extend `rendering/arrowhead.ts` `drawArrowhead()` with new cases. Each arrowhead is a small canvas path drawn at the tangent angle of the arrow endpoint.

#### 7. Arrowhead Picker UI

**What Excalidraw does:** Properties panel with two button groups (start/end), each showing all 12 options as icon buttons.

**New component:** `features/tools/components/ArrowheadPicker.vue`

- Shows when an arrow is selected or arrow tool is active
- Two groups: start arrowhead, end arrowhead
- Updates element on click, and persists choice for future arrows via `currentItemStartArrowhead` / `currentItemEndArrowhead` state

---

### P2 — Focus Points & Advanced Binding

#### 8. Focus Point Dragging

**What Excalidraw does:** When a 2-point bound arrow is selected, a small dot appears on the bound shape's surface showing where the arrow connects. Users can drag this dot to reposition the connection point.

**Behavior:**

- Only for simple (non-elbow) arrows with exactly 2 points
- Focus point is the `fixedPoint` from `FixedPointBinding`, rendered as a filled circle on the shape
- Hit detection: `FOCUS_POINT_SIZE * 1.5 / zoom` threshold
- Dragging updates `fixedPoint` and recalculates arrow endpoint
- Alt key during drag toggles orbit ↔ inside mode
- Focus point not visible for elbow arrows (their binding is algorithmic)

**New files:**

- `features/binding/useFocusPoint.ts` — focus point interaction
- `features/binding/renderFocusPoint.ts` — render the draggable dot

#### 9. Arrow Labels (Text on Arrows)

**What Excalidraw does:** Arrows can contain bound text labels positioned at the midpoint. Label width = 70% of arrow length.

**Data model:** `boundTextElementId: string | null` on arrow, referencing a `text` element.

**Defer to:** separate spec — requires text element type which we don't have yet.

---

### P3 — Elbow Arrows

#### 10. Elbow Arrow Routing (A\* Pathfinding)

**What Excalidraw does:** Elbow arrows use A\* pathfinding on a dynamic grid to produce orthogonal (right-angle only) paths that route around obstacles.

**Data model:**

```ts
interface ExcalidrawElbowArrowElement extends ExcalidrawArrowElement {
  arrowSubtype: "elbow";
  fixedSegments: readonly FixedSegment[] | null;
  startIsSpecial: boolean | null;
  endIsSpecial: boolean | null;
}

interface FixedSegment {
  start: Point;
  end: Point;
  index: number;
}
```

**Algorithm (from `elbowArrow.ts`):**

1. Compute AABBs (padded by 40px) of bound elements + nearby obstacles
2. Determine heading at start/end (UP/DOWN/LEFT/RIGHT) from shape geometry
3. Build a sparse grid from AABB edges and intersections
4. Run A\* with BinaryHeap on this grid
5. Simplify: merge collinear segments
6. Apply user-fixed segments as constraints
7. Deduplicate points within 1px threshold

**New files:**

- `features/elbow-arrow/elbowRouter.ts` — A\* routing algorithm
- `features/elbow-arrow/grid.ts` — dynamic grid generation
- `features/elbow-arrow/fixedSegments.ts` — user segment overrides

**Special behavior:**

- Elbow arrows are always 2-point from user perspective (no multi-point creation)
- Clicking a third point immediately finalizes
- Cannot enter linear editor (editing is done by dragging endpoints/segments)
- `fixedSegments` allow users to drag individual segments to override routing

#### 11. Tool Lock Mode

**What Excalidraw does:** Double-clicking the arrow tool icon (or pressing a lock button) keeps the arrow tool active after each creation, instead of returning to selection.

**Where:** `useTool.ts` — add `locked: boolean` state. After finalization in `useDrawingInteraction.ts`, check `locked` before resetting to selection.

---

## Implementation Order

```
Phase 1: Binding Foundation
  1.1  Add FixedPointBinding + boundElements to types
  1.2  Implement proximity detection (getHoveredElementForBinding)
  1.3  Implement bind/unbind logic
  1.4  Wire into useDrawingInteraction (bind on arrow creation)
  1.5  Wire into useSelectionInteraction (update arrows on shape drag/resize)
  1.6  Render suggested binding highlight
  1.7  Add minimum arrow size threshold (20px)

Phase 2: Arrow Subtypes & Arrowheads
  2.1  Add arrowSubtype to data model + tool cycling
  2.2  Implement bezier path rendering (round arrows)
  2.3  Add all 12 arrowhead types to rendering
  2.4  Build ArrowheadPicker UI component

Phase 3: Focus Points
  3.1  Render focus point indicator on bound shapes
  3.2  Implement focus point drag interaction
  3.3  Implement orbit/inside mode toggle (Alt key)

Phase 4: Elbow Arrows
  4.1  Add elbow arrow types to data model
  4.2  Implement A* routing algorithm
  4.3  Implement fixed segment overrides
  4.4  Wire elbow-specific finalization (no multi-point)

Phase 5: Polish
  5.1  Tool lock mode
  5.2  Arrow labels (requires text element type)
  5.3  Ctrl to disable binding during creation
  5.4  Z-index: move arrow above bound shape on bind
```

---

## Modifier Key Reference (target behavior)

| Key          | During Creation                         | During Editing                        |
| ------------ | --------------------------------------- | ------------------------------------- |
| **Shift**    | Constrain angle to 15deg increments     | Same on point drag                    |
| **Ctrl/Cmd** | Disable binding entirely                | Disable binding for this drag         |
| **Alt**      | Switch to "inside" binding mode         | Toggle orbit ↔ inside on focus point  |
| **A**        | Cycle arrow subtype (sharp→round→elbow) | —                                     |
| **Escape**   | Finalize multi-point / exit editor      | Exit editor                           |
| **Enter**    | Finalize multi-point                    | —                                     |
| **Delete**   | —                                       | Remove selected points (min 2 remain) |

---

## Constants to Match

```ts
MINIMUM_ARROW_SIZE = 20; // px — min size for valid arrow
LINE_CONFIRM_THRESHOLD = 8; // px — click near last point = finalize
BASE_BINDING_GAP = 5; // px — gap between arrowhead and shape
BASE_BINDING_DISTANCE = 15; // px — max detection distance at zoom=1
SHIFT_LOCKING_ANGLE = Math.PI / 12; // 15deg snap increment
ARROW_LABEL_WIDTH_FRACTION = 0.7; // label takes 70% of arrow width
FOCUS_POINT_SIZE = 10 / 1.5; // ~6.67px radius
BASE_PADDING = 40; // px — elbow arrow obstacle padding
```

---

## File Structure

### Existing (implemented)

```
packages/core/src/features/
├── binding/
│   ├── index.ts                        # Barrel exports
│   ├── types.ts                        # BindableElement, BindingEndpoint, isBindableElement()
│   ├── constants.ts                    # BASE_BINDING_GAP, BASE_BINDING_DISTANCE, MINIMUM_ARROW_SIZE, colors
│   ├── proximity.ts                    # getHoveredElementForBinding, distanceToShapeEdge, computeFixedPoint, getPointFromFixedPoint
│   ├── bindUnbind.ts                   # bindArrowToElement, unbindArrowEndpoint, unbindAllArrowsFromShape, unbindArrow, findBindableElement
│   ├── updateBoundPoints.ts            # updateBoundArrowEndpoints, updateArrowEndpoint, updateArrowBindings
│   ├── renderBindingHighlight.ts       # renderSuggestedBinding (themed highlight)
│   ├── boundText.ts                    # bindTextToContainer, unbindTextFromContainer, deleteBoundTextForContainer, updateBoundTextAfterContainerChange
│   ├── bindUnbind.unit.test.ts
│   ├── updateBoundPoints.unit.test.ts
│   └── proximity.unit.test.ts
├── linear-editor/
│   ├── index.ts                        # Barrel exports
│   ├── types.ts                        # MultiPointCreationState, LinearEditorState
│   ├── constants.ts                    # Handle sizes, hit thresholds, theme colors
│   ├── pointHandles.ts                 # Point positions, hit testing, insert/remove/normalize/move points
│   ├── useMultiPointCreation.ts        # Click-to-place multi-point creation composable
│   ├── useLinearEditor.ts              # Double-click-to-edit linear editor composable
│   ├── renderLinearEditor.ts           # Rubber band, point handles, midpoint indicators
│   ├── pointHandles.unit.test.ts
│   ├── useLinearEditor.unit.test.ts
│   ├── useMultiPointCreation.unit.test.ts
│   ├── linearEditor.browser.test.ts
│   └── multiPoint.browser.test.ts
├── elbow/                              # Elbow arrow routing — DONE
│   ├── index.ts
│   ├── types.ts
│   ├── constants.ts
│   ├── astar.ts                        # A* routing algorithm
│   ├── grid.ts                         # Dynamic grid from AABBs
│   ├── routeElbow.ts                   # Route orchestration
│   ├── shape.ts                        # Elbow arrow shape generation
│   ├── validation.ts                   # Orthogonality validation
│   └── *.unit.test.ts
└── groups/
    ├── index.ts
    ├── types.ts                        # GroupId re-export
    ├── groupUtils.ts                   # Group manipulation + re-exports from @excalidraw/element
    ├── groupUtils.unit.test.ts
    └── composables/
        └── useGroups.ts                # Group/ungroup composable
```

### Planned (not yet implemented)

```
packages/core/src/features/
└── binding/
    ├── useFocusPoint.ts            # Focus point drag interaction (P2)
    └── renderFocusPoint.ts         # Focus point dot rendering (P2)
```
