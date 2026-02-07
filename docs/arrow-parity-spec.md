# Arrow Parity Spec — Matching Excalidraw's Arrow UX

> Goal: make our arrows behave identically to Excalidraw's arrows.
> Reference: `walkthrough-arrow-ux.html` (full Excalidraw source analysis)

---

## Current State (what we have)

| Feature | Status | File(s) |
|---------|--------|---------|
| Arrow element type (`type: "arrow"`) | Done | `elements/types.ts` |
| Point array (local coords, first=[0,0]) | Done | `elements/types.ts`, `linear-editor/pointHandles.ts` |
| Arrow creation (click-drag) | Done | `tools/useDrawingInteraction.ts` |
| Multi-point creation (click-to-place) | Done | `linear-editor/useMultiPointCreation.ts` |
| Shift-constrained angle snap (15deg) | Done | `tools/useDrawingInteraction.ts:74`, `shared/math.ts` |
| Finalize via Escape/Enter/dblclick | Done | `linear-editor/useMultiPointCreation.ts:97-110` |
| Linear editor (double-click to edit) | Done | `linear-editor/useLinearEditor.ts` |
| Point handles (select, drag, Shift-multi) | Done | `linear-editor/useLinearEditor.ts` |
| Midpoint insertion (hover + click) | Done | `linear-editor/pointHandles.ts` |
| Point deletion (Delete/Backspace) | Done | `linear-editor/useLinearEditor.ts:209` |
| Arrowhead rendering (arrow, triangle) | Partial | `rendering/arrowhead.ts` |
| Rubber-band preview (multi-point) | Done | `linear-editor/renderLinearEditor.ts` |
| Selection border for arrows | Done | `rendering/renderInteractive.ts` |
| Hit testing (segment distance) | Done | `selection/hitTest.ts:123` |
| 3-layer canvas (static/newElement/interactive) | Done | `canvas/composables/useCanvasLayers.ts` |
| Roughjs rendering | Done | `rendering/shapeGenerator.ts` |

## Gap Analysis (what's missing)

### P0 — Core Arrow Behavior

#### 1. Binding System (arrows attach to shapes)
**What Excalidraw does:** When an arrow endpoint is dragged near a shape, a `FixedPointBinding` is created linking the arrow to the shape. Moving the shape auto-updates the arrow. This is the single biggest feature gap.

**Data model changes needed:**
```ts
// elements/types.ts
type BindMode = 'inside' | 'orbit' | 'skip'

interface FixedPointBinding {
  elementId: string              // ID of bound shape
  fixedPoint: [number, number]   // 0.0-1.0 ratio on shape surface
  mode: BindMode
}

interface ExcalidrawArrowElement extends ExcalidrawElementBase {
  readonly type: 'arrow'
  points: readonly Point[]
  startArrowhead: ArrowheadType | null
  endArrowhead: ArrowheadType
  startBinding: FixedPointBinding | null  // NEW
  endBinding: FixedPointBinding | null    // NEW
}
```

**Behavior to implement:**
- Proximity detection: `getHoveredElementForBinding()` — find nearest bindable shape within `maxBindingDistance` (15px at zoom=1, scales with zoom)
- Binding gap: 5px space between arrowhead and shape edge
- Orbit mode (default): arrow endpoint projected onto shape edge
- Inside mode (Alt key): arrow endpoint at exact cursor position inside shape
- Skip mode (Ctrl key): no binding, arrow passes through
- Bidirectional references: arrow stores `startBinding`/`endBinding`, shape stores `boundElements[]`
- On shape move/resize: recalculate all bound arrow endpoints
- On arrow finalize: commit binding

**New files:**
- `features/binding/useBinding.ts` — binding composable
- `features/binding/bindingStrategy.ts` — strategy pattern for different contexts
- `features/binding/proximity.ts` — proximity detection, hit testing for bindable shapes
- `features/binding/updateBoundPoints.ts` — recalculate arrow endpoints when shapes move

**Integration points:**
- `useDrawingInteraction.ts` pointermove: check for binding candidates, set `suggestedBinding`
- `useDrawingInteraction.ts` pointerup: commit binding
- `useSelectionInteraction.ts` drag: recalculate bound arrows when dragging shapes
- `useSelectionInteraction.ts` resize: recalculate bound arrows when resizing shapes
- `renderInteractive.ts`: render suggested binding highlight (blue outline on target shape)

#### 2. Bound Element Back-References
**What Excalidraw does:** Every bindable shape stores a `boundElements` array: `{ id: string, type: 'arrow' }[]`. When a shape is deleted, its bound arrows are unbound.

**Data model changes needed:**
```ts
// elements/types.ts — add to ExcalidrawElementBase or each bindable type
boundElements?: readonly { id: string; type: 'arrow' }[]
```

**Behavior:**
- On bind: add arrow ref to shape's `boundElements`
- On unbind: remove arrow ref from shape's `boundElements`
- On shape delete: unbind all arrows in `boundElements`
- On arrow delete: remove from all bound shapes' `boundElements`

#### 3. Suggested Binding Preview
**What Excalidraw does:** During arrow creation/editing, the hovered binding target gets a blue highlight (the `suggestedBinding` in app state).

**New state:**
```ts
// In CanvasContainer or a binding composable
const suggestedBinding = shallowRef<ExcalidrawElement | null>(null)
```

**Render:** Draw a blue stroke outline around the `suggestedBinding` element on the interactive canvas.

#### 4. Minimum Arrow Size Threshold
**What Excalidraw does:** Arrows smaller than `MINIMUM_ARROW_SIZE = 20px` are deleted on finalize. Prevents accidental micro-arrows.

**Where:** `useDrawingInteraction.ts:118` — currently checks `width > 1 || height > 1`. Change to:
```ts
const MINIMUM_ARROW_SIZE = 20
const isValid = el.type === 'arrow'
  ? Math.hypot(el.width, el.height) >= MINIMUM_ARROW_SIZE
  : el.width > 1 || el.height > 1
```

---

### P1 — Arrow Subtypes

#### 5. Arrow Type Variants (sharp / round / elbow)
**What Excalidraw does:** Three subtypes cycled via pressing `A` repeatedly:
- Sharp: `roundness: null, elbowed: false` — straight line segments
- Round (default): `roundness: { type: 2 }, elbowed: false` — bezier curves
- Elbow: `roundness: null, elbowed: true` — orthogonal A* routing

**Data model changes:**
```ts
// elements/types.ts
type ArrowSubtype = 'sharp' | 'round' | 'elbow'

interface ExcalidrawArrowElement extends ExcalidrawElementBase {
  // ... existing
  arrowSubtype: ArrowSubtype  // NEW — default: 'round'
}
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
  | 'arrow'              // open chevron (default end)
  | 'bar'                // perpendicular line
  | 'circle'             // filled circle
  | 'circle_outline'     // outlined circle
  | 'triangle'           // filled triangle
  | 'triangle_outline'   // outlined triangle
  | 'diamond'            // filled diamond
  | 'diamond_outline'    // outlined diamond
  | 'crowfoot_one'       // ERD: one
  | 'crowfoot_many'      // ERD: many (crow's foot)
  | 'crowfoot_one_or_many' // ERD: one-or-many
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

#### 10. Elbow Arrow Routing (A* Pathfinding)
**What Excalidraw does:** Elbow arrows use A* pathfinding on a dynamic grid to produce orthogonal (right-angle only) paths that route around obstacles.

**Data model:**
```ts
interface ExcalidrawElbowArrowElement extends ExcalidrawArrowElement {
  arrowSubtype: 'elbow'
  fixedSegments: readonly FixedSegment[] | null
  startIsSpecial: boolean | null
  endIsSpecial: boolean | null
}

interface FixedSegment {
  start: Point
  end: Point
  index: number
}
```

**Algorithm (from `elbowArrow.ts`):**
1. Compute AABBs (padded by 40px) of bound elements + nearby obstacles
2. Determine heading at start/end (UP/DOWN/LEFT/RIGHT) from shape geometry
3. Build a sparse grid from AABB edges and intersections
4. Run A* with BinaryHeap on this grid
5. Simplify: merge collinear segments
6. Apply user-fixed segments as constraints
7. Deduplicate points within 1px threshold

**New files:**
- `features/elbow-arrow/elbowRouter.ts` — A* routing algorithm
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

| Key | During Creation | During Editing |
|-----|----------------|----------------|
| **Shift** | Constrain angle to 15deg increments | Same on point drag |
| **Ctrl/Cmd** | Disable binding entirely | Disable binding for this drag |
| **Alt** | Switch to "inside" binding mode | Toggle orbit ↔ inside on focus point |
| **A** | Cycle arrow subtype (sharp→round→elbow) | — |
| **Escape** | Finalize multi-point / exit editor | Exit editor |
| **Enter** | Finalize multi-point | — |
| **Delete** | — | Remove selected points (min 2 remain) |

---

## Constants to Match

```ts
MINIMUM_ARROW_SIZE = 20           // px — min size for valid arrow
LINE_CONFIRM_THRESHOLD = 8        // px — click near last point = finalize
BASE_BINDING_GAP = 5              // px — gap between arrowhead and shape
BASE_BINDING_DISTANCE = 15        // px — max detection distance at zoom=1
SHIFT_LOCKING_ANGLE = Math.PI / 12 // 15deg snap increment
ARROW_LABEL_WIDTH_FRACTION = 0.7  // label takes 70% of arrow width
FOCUS_POINT_SIZE = 10 / 1.5       // ~6.67px radius
BASE_PADDING = 40                 // px — elbow arrow obstacle padding
```

---

## File Structure (new files)

```
app/features/
├── binding/
│   ├── index.ts
│   ├── types.ts                    # FixedPointBinding, BindMode, BindingStrategy
│   ├── constants.ts                # BASE_BINDING_GAP, distances, thresholds
│   ├── proximity.ts                # getHoveredElementForBinding, distanceToElement
│   ├── bindingStrategy.ts          # Strategy pattern for bind/unbind decisions
│   ├── updateBoundPoints.ts        # Recalculate arrow endpoints on shape move
│   ├── useBinding.ts               # Main composable — wires into creation/editing
│   ├── useFocusPoint.ts            # Focus point drag interaction
│   ├── renderBindingIndicator.ts   # Blue highlight on binding target
│   └── renderFocusPoint.ts         # Focus point dot rendering
├── elbow-arrow/
│   ├── index.ts
│   ├── types.ts                    # FixedSegment, ElbowArrowData, Grid, Node
│   ├── elbowRouter.ts             # A* routing algorithm
│   ├── grid.ts                     # Dynamic grid from AABBs
│   └── fixedSegments.ts           # User segment override logic
└── tools/
    └── components/
        └── ArrowheadPicker.vue     # Arrowhead selection UI
```
