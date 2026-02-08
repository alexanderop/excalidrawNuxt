# Arrow Technical Specification

> Reverse-engineered from Excalidraw source code. Use as the authoritative reference when implementing arrows in our Nuxt/Vue canvas.

---

## Table of Contents

1. [Data Model](#1-data-model)
2. [Arrow Subtypes](#2-arrow-subtypes)
3. [Coordinate System](#3-coordinate-system)
4. [Binding System](#4-binding-system)
5. [Curve Generation & Rendering](#5-curve-generation--rendering)
6. [Arrowhead Geometry](#6-arrowhead-geometry)
7. [Elbow Arrow Routing](#7-elbow-arrow-routing)
8. [Linear Element Editor (Interaction)](#8-linear-element-editor-interaction)
9. [Creation Interaction Flow](#9-creation-interaction-flow)
10. [Hit Testing](#10-hit-testing)
11. [Constants Reference](#11-constants-reference)

---

## 1. Data Model

### ExcalidrawArrowElement (Full Type)

```typescript
type ExcalidrawArrowElement = {
  // Identity
  id: string
  type: 'arrow'

  // Position & geometry
  x: number                          // Canvas X (top-left of bounding box)
  y: number                          // Canvas Y (top-left of bounding box)
  width: number                      // Bounding box width
  height: number                     // Bounding box height
  angle: Radians                     // Rotation in radians
  points: readonly LocalPoint[]      // [x, y] offsets from (x, y)

  // Rendering
  strokeColor: string                // Hex color
  backgroundColor: string            // Fill color
  fillStyle: 'hachure' | 'cross-hatch' | 'solid' | 'zigzag'
  strokeWidth: number                // Line thickness (px)
  strokeStyle: 'solid' | 'dashed' | 'dotted'
  roughness: number                  // Hand-drawn intensity (0=clean, 1=artist, 2=cartoonist)
  opacity: number                    // 0–100
  seed: number                       // Deterministic randomness for roughjs

  // Roundness (determines sharp vs curved)
  roundness: null | {
    type: 1 | 2 | 3                  // 2 = PROPORTIONAL_RADIUS (used for arrows)
    value?: number                   // Curvature proportion (default 0.25)
  }

  // Arrowheads
  startArrowhead: Arrowhead | null
  endArrowhead: Arrowhead | null

  // Binding (connection to shapes)
  startBinding: FixedPointBinding | null
  endBinding: FixedPointBinding | null

  // Elbow-specific
  elbowed: boolean

  // Metadata
  version: number
  versionNonce: number
  index: FractionalIndex | null
  isDeleted: boolean
  groupIds: readonly string[]
  frameId: string | null
  boundElements: readonly BoundElement[] | null  // e.g. text labels
  updated: number                    // Timestamp (ms)
  link: string | null
  locked: boolean
  customData?: Record<string, any>
}
```

### ExcalidrawElbowArrowElement (extends arrow)

```typescript
type ExcalidrawElbowArrowElement = ExcalidrawArrowElement & {
  elbowed: true
  fixedSegments: readonly FixedSegment[] | null  // User-anchored segments
  startIsSpecial: boolean | null                 // Hide first segment flag
  endIsSpecial: boolean | null                   // Hide last segment flag
}

type FixedSegment = {
  start: LocalPoint    // Must be purely H or V
  end: LocalPoint
  index: number        // Segment index in points array
}
```

### FixedPointBinding

```typescript
type FixedPointBinding = {
  elementId: string           // ID of bound target element
  fixedPoint: [number, number] // Normalized [0–1, 0–1] position on target
  mode: 'inside' | 'orbit' | 'skip'
}
```

| Mode | Behavior |
|------|----------|
| `orbit` | Arrow stops at element edge (respects binding gap) |
| `inside` | Arrow extends to fixedPoint inside the shape |
| `skip` | Free-form (experimental) |

### Arrowhead Types

```typescript
type Arrowhead =
  | 'arrow'              // Standard triangle (solid)
  | 'bar'                // Perpendicular line
  | 'dot'                // Circle (legacy)
  | 'circle'             // Circle (filled)
  | 'circle_outline'     // Circle (hollow)
  | 'triangle'           // Triangle (filled)
  | 'triangle_outline'   // Triangle (hollow)
  | 'diamond'            // Diamond (filled)
  | 'diamond_outline'    // Diamond (hollow)
  | 'crowfoot_one'       // ER diagram: one
  | 'crowfoot_many'      // ER diagram: many
  | 'crowfoot_one_or_many' // ER diagram: one-or-many
```

---

## 2. Arrow Subtypes

Three distinct arrow behaviors determined by `elbowed` and `roundness`:

```
┌──────────────────────────────────────────────────────────┐
│                   Arrow Subtypes                         │
├──────────────┬────────────┬──────────────────────────────┤
│ Sharp Arrow  │ elbowed=F  │ roundness=null               │
│              │            │ Straight line segments        │
├──────────────┼────────────┼──────────────────────────────┤
│ Curved Arrow │ elbowed=F  │ roundness={type:2}           │
│              │            │ Catmull-Rom Bezier curves     │
├──────────────┼────────────┼──────────────────────────────┤
│ Elbow Arrow  │ elbowed=T  │ Orthogonal (90°) segments    │
│              │            │ A* pathfinding, auto-routed   │
└──────────────┴────────────┴──────────────────────────────┘
```

Type guards:
```typescript
isArrowElement(el)    // el.type === 'arrow'
isElbowArrow(el)      // el.type === 'arrow' && el.elbowed
isSimpleArrow(el)     // el.type === 'arrow' && !el.elbowed
isSharpArrow(el)      // !elbowed && !roundness
isCurvedArrow(el)     // !elbowed && roundness !== null
```

---

## 3. Coordinate System

### Local vs Global Points

```
Canvas Space (Global)
│
├─ Arrow at (x=100, y=200)
│  points: [[0,0], [50,30], [100,0]]   ← LOCAL (relative to x,y)
│
│  Global positions:
│    [100, 200]   (start)
│    [150, 230]   (middle)
│    [200, 200]   (end)
│
└─ Invariant: points[0] is ALWAYS [0, 0]
```

**Conversions:**
```typescript
// Local → Global
globalX = arrow.x + localPoint[0]
globalY = arrow.y + localPoint[1]
// (then rotate around element center by arrow.angle)

// Global → Local
// (rotate point by -arrow.angle around element center)
localX = rotatedGlobalX - arrow.x
localY = rotatedGlobalY - arrow.y
```

**Normalization:** When points change, first point is shifted to `[0,0]` and `arrow.x/y` is adjusted by the offset. This maintains the invariant.

### FixedPoint Coordinates (Binding)

```typescript
// Normalized [0–1, 0–1] on bound element
[0.5, 0.5]  → center
[0, 0]      → top-left
[1, 1]      → bottom-right
[0.5, 0]    → top edge center
[1, 0.5]    → right edge center

// Convert to global:
globalX = element.x + fixedPoint[0] * element.width
globalY = element.y + fixedPoint[1] * element.height
// (then rotate around element center by element.angle)
```

---

## 4. Binding System

### How Binding Works

```
┌─────────────────────────────────────────────────────┐
│              BINDING LIFECYCLE                       │
│                                                     │
│  1. DETECTION                                       │
│     Arrow endpoint within maxBindingDistance (15-30px)│
│     of a bindable element → show highlight          │
│                                                     │
│  2. COMMITMENT                                      │
│     On pointerUp → create FixedPointBinding         │
│     Store fixedPoint ratio + mode                   │
│                                                     │
│  3. MAINTENANCE                                     │
│     Bound element moves → updateBoundElements()     │
│     Arrow endpoint recalculated from fixedPoint     │
│                                                     │
│  4. UNBINDING                                       │
│     Drag beyond threshold / delete target / disable │
│     → set binding to null                           │
└─────────────────────────────────────────────────────┘
```

### Detection Thresholds

```typescript
maxBindingDistance_simple(zoom) {
  const BASE = Math.max(BASE_BINDING_GAP, 15)  // 15px minimum
  const zoomValue = zoom?.value < 1 ? zoom.value : 1
  return clamp(BASE / (zoomValue * 1.5), BASE, BASE * 2)  // 15–30px
}
```

- Hover detection: 15–30px (zoom-adjusted)
- Prefers **smallest** overlapping element (by area)
- Scans front-to-back (z-index order)

### Binding Gap

```typescript
getBindingGap(target, arrow) {
  return (arrow.elbowed ? 5 : 5) + target.strokeWidth / 2
}
```

Gap = `5px + strokeWidth/2` — visual separation between arrowhead and element edge.

### Binding Modes by Context

| Context | Start Mode | End Mode |
|---------|-----------|----------|
| Creating from inside shape | `inside` | `orbit` |
| Creating from outside shape | — | `orbit` |
| Both endpoints on same shape | `inside` | `inside` |
| Alt key held | `inside` | `inside` |
| Elbow arrows | always `orbit` | always `orbit` |
| Dragging endpoint inside shape | `inside` | — |
| Dragging endpoint outside shape | `orbit` | — |

### Intersection Calculation

How the arrow meets the element edge:

```typescript
intersectElementWithLineSegment(element, line, offset) {
  // 1. Fast: bounding box rejection test
  // 2. Slow: shape-specific intersection
  switch (element.type) {
    case 'rectangle': // Line-to-4-edges intersection
    case 'diamond':   // Line-to-4-diagonal-edges
    case 'ellipse':   // Line-to-bezier-curves intersection
  }
}
```

### Update on Element Move

When a bound element moves:
1. Get all arrows from `element.boundElements[]`
2. For each arrow, recalculate endpoint from stored `fixedPoint` ratio
3. Call `LinearElementEditor.movePoints()` with new positions
4. If arrow becomes very short (<40px between elements) → switch to `inside` mode

---

## 5. Curve Generation & Rendering

### Pipeline Overview

```
Element Data
    ↓
Shape Generation (shape.ts)
    ↓ sharp: roughjs.linearPath(points)
    ↓ round: roughjs.curve(points)      ← Catmull-Rom
    ↓ elbow: roughjs.path(svgPath)      ← SVG with Q curves at corners
    ↓
RoughJS Processing
    ↓ Applies hand-drawn noise (seed-based)
    ↓ Applies dash patterns if needed
    ↓ Generates canvas operations (moveTo, lineTo, bezierCurveTo)
    ↓
Arrowhead Generation
    ↓ Extracts curve tangent at t=0.3
    ↓ Calculates arrowhead geometry
    ↓ Renders via RoughJS (circle, polygon, line)
    ↓
Canvas Rendering
    ↓ context.lineJoin = "round"
    ↓ context.lineCap = "round"
    ↓ rc.draw(shape)  ← RoughJS executes operations
    ↓
Rendered Arrow on Screen
```

### Catmull-Rom Cubic Approximation (Curved Arrows)

For each pair of consecutive points, generates a cubic Bezier curve:

```
Given points p0, p1, p2, p3 with tension τ = 0.5:

tangent₁ = (p₂ - p₀) × τ
tangent₂ = (p₃ - p₁) × τ

controlPoint1 = p₁ + tangent₁ / 3
controlPoint2 = p₂ - tangent₂ / 3

Bezier curve: [p₁, cp1, cp2, p₂]
```

The cubic Bezier equation:
```
B(t) = (1-t)³·P₀ + 3(1-t)²t·P₁ + 3(1-t)t²·P₂ + t³·P₃
```

### Elbow Arrow Shape (Rounded Corners)

Elbow corners use quadratic Bezier curves with radius = 16px:

```typescript
cornerRadius = Math.min(16, dist_to_next / 2, dist_to_prev / 2)
// SVG path: L <before_corner> Q <corner_point> <after_corner>
```

### RoughJS Options

```typescript
{
  seed: element.seed,           // Deterministic randomness
  roughness: adjustedRoughness, // Reduced for small elements
  strokeLineDash:
    dashed → [8, 8 + strokeWidth]
    dotted → [1.5, 6 + strokeWidth]
    solid  → undefined,
  disableMultiStroke: strokeStyle !== 'solid',
  strokeWidth: strokeStyle === 'solid' ? sw : sw + 0.5,
  preserveVertices: roughness < 2,  // Keep vertices exact for clean arrows
}
```

### Shape Caching

Shapes are cached in a `WeakMap<Element, Shape>` and only regenerated when:
- Element version changes
- Zoom level changes
- Theme changes (dark mode)

---

## 6. Arrowhead Geometry

### Size and Angle by Type

| Arrowhead | Size (px) | Angle (°) | Geometry |
|-----------|-----------|-----------|----------|
| `arrow` | 25 | 20 | Two lines from base to apex |
| `bar` | 15 | 90 | Perpendicular line |
| `circle` | 15 | — | Filled circle |
| `circle_outline` | 15 | — | Hollow circle (bg fill) |
| `triangle` | 15 | 25 | Filled 3-point polygon |
| `triangle_outline` | 15 | 25 | Hollow triangle (bg fill) |
| `diamond` | 12 | 25 | Filled 4-point polygon |
| `diamond_outline` | 12 | 25 | Hollow diamond (bg fill) |
| `crowfoot_one` | 20 | — | Single perpendicular line |
| `crowfoot_many` | 20 | — | Three angled lines (crow's foot) |
| `crowfoot_one_or_many` | 20 | — | Combined one + many |

### Size Scaling

Arrowheads scale down if the last segment is too short:

```typescript
lengthMultiplier = (diamond | diamond_outline) ? 0.25 : 0.5
actualSize = Math.min(arrowheadSize, lastSegmentLength * lengthMultiplier)
```

### Orientation Calculation

The arrowhead angle is derived from the curve tangent at t=0.3:

```typescript
// Evaluate Bezier curve at t=0.3 (near the endpoint)
const [x1, y1] = bezierAt(t = 0.3)
const [x2, y2] = endpoint

// Direction vector
const nx = (x2 - x1) / distance(x1,y1, x2,y2)
const ny = (y2 - y1) / distance(x1,y1, x2,y2)

// Arrowhead base position
const xs = x2 - nx * actualSize
const ys = y2 - ny * actualSize
```

---

## 7. Elbow Arrow Routing

### Algorithm: Modified A* Pathfinding

```
┌──────────────────────────────────────────────────────────────┐
│                   ELBOW ARROW PIPELINE                       │
│                                                              │
│  getElbowArrowData()                                         │
│    ├─ Determine start/end binding elements                   │
│    ├─ Calculate startHeading & endHeading                    │
│    └─ Generate dynamicAABBs, donglePositions, commonBounds   │
│                                                              │
│  routeElbowArrow()                                           │
│    ├─ calculateGrid() → non-uniform grid from obstacle edges │
│    ├─ pointToGridNode() → map start/end to grid nodes        │
│    └─ astar() → pathfind with bend penalties                 │
│                                                              │
│  Post-processing:                                            │
│    ├─ getElbowArrowCornerPoints() → keep only direction changes│
│    ├─ removeElbowArrowShortSegments() → filter < 1px         │
│    └─ normalizeArrowElementUpdate() → convert to local coords │
└──────────────────────────────────────────────────────────────┘
```

### Grid System

**Non-uniform grid** built from obstacle boundaries:

```typescript
// Grid lines placed at:
// - Start/end constraint points (based on heading)
// - All obstacle AABB edges (left, right, top, bottom)
// - Common bounding box edges

// Result: variable-resolution grid that snaps to obstacle edges
```

### Heading System

```typescript
HEADING_RIGHT = [1, 0]
HEADING_DOWN  = [0, 1]
HEADING_LEFT  = [-1, 0]
HEADING_UP    = [0, -1]
```

Exit/entry direction determined by `headingForPointFromElement()`:
- Uses triangle "search cones" from element center
- Cross-product test determines which quadrant the target is in
- Returns the edge direction toward that quadrant

### A* Cost Function

```typescript
// g-score (actual cost):
gScore = current.g + manhattan_dist(neighbor, current)
       + (directionChange ? bendMultiplier³ : 0)

// h-score (heuristic):
hScore = manhattan_dist(neighbor, end)
       + estimatedBendCount * bendMultiplier²

// bendMultiplier = manhattan_dist(start, end)
// Heavy penalty for turns → produces straighter paths
```

### Obstacle Avoidance

- **Dynamic AABBs** around bound elements expand/contract based on heading
- Midpoint collision test: path blocked if midpoint between nodes intersects any AABB
- **Dongle positions**: path starts/ends at element edge (not center)
- No backtracking: reverse direction explicitly forbidden

### Fixed Segments (User-Anchored)

- Users drag segments to lock them in place
- First and last segments CANNOT be fixed
- Each fixed segment must be purely horizontal OR vertical
- When fixed segments exist, only non-fixed parts are rerouted
- `BASE_PADDING = 40px` minimum distance from element to route start

### Validation

```typescript
// Every segment must be orthogonal:
for (let i = 1; i < points.length; i++) {
  assert(
    points[i-1][0] === points[i][0] ||  // Same X (vertical)
    points[i-1][1] === points[i][1]     // Same Y (horizontal)
  )
}
```

---

## 8. Linear Element Editor (Interaction)

### Editor State

```typescript
type LinearElementEditor = {
  elementId: string
  selectedPointsIndices: readonly number[] | null
  isDragging: boolean
  lastUncommittedPoint: LocalPoint | null
  hoverPointIndex: number                       // -1 = none
  segmentMidPointHoveredCoords: GlobalPoint | null
  elbowed: boolean
  customLineAngle: number | null                // Shift-locked angle
  isEditing: boolean

  // Binding visualization
  hoveredFocusPointBinding: 'start' | 'end' | null
  draggedFocusPointBinding: 'start' | 'end' | null

  // Interaction state
  initialState: {
    prevSelectedPointsIndices: readonly number[] | null
    lastClickedPoint: number
    origin: GlobalPoint | null
    segmentMidpoint: {
      value: GlobalPoint | null
      index: number | null
      added: boolean
    }
    arrowStartIsInside: boolean
    altFocusPoint: GlobalPoint | null
  }
}
```

### Point Manipulation

| Operation | Mechanism |
|-----------|-----------|
| **Select point** | Click within `(POINT_HANDLE_SIZE + 1) / zoom` ≈ 11px |
| **Multi-select** | Shift+click toggles individual points |
| **Drag point** | Updates position, recalculates bindings |
| **Add midpoint** | Hover segment center, drag when beyond `DRAGGING_THRESHOLD` |
| **Delete point** | Keyboard delete, filters point from array |
| **Shift+drag** | Locks angle to 15° increments |

### Last Uncommitted Point

During creation, the most recent point hasn't been finalized yet:

```
Alt+move → lastUncommittedPoint = new point (live preview)
Alt+move again → same point MOVES (not a new point)
Release Alt → uncommitted point DELETED
Alt+click → point COMMITTED → lastUncommittedPoint = null
```

This enables smooth "preview" creation without intermediate artifacts.

### Coordinate Handling

Points iterate backward for hit detection (rightmost/top point wins on overlap).
Elbow arrows restrict selection to endpoints only (middle points auto-computed).

---

## 9. Creation Interaction Flow

### State Machine

```
IDLE
  │  click arrow tool
  ▼
TOOL_ACTIVE (activeTool.type = 'arrow')
  │  pointerDown on canvas
  ▼
CREATION_STARTED
  │  newElement created: points = [[0,0], [0,0]]
  │  multiElement = element, newElement = element
  │  pointerMove
  ▼
DRAGGING_ENDPOINT
  │  LinearElementEditor.handlePointerMove() updates last point
  │  Binding hover detection active
  │
  ├── pointerUp (drag-to-create) → FINALIZED (2-point arrow)
  │
  ├── pointerDown (click pattern, dist > 8px) → ADD_POINT
  │     └── returns to DRAGGING_ENDPOINT
  │
  ├── pointerDown (click near last point, dist < 8px) → FINALIZED
  │
  └── pointerDown (on binding target) → FINALIZED (with binding)
```

### Single-Segment vs Multi-Segment

| Type | Interaction | Result |
|------|-------------|--------|
| Single-segment | Drag: pointerDown → move → pointerUp | 2 points |
| Multi-segment | Click-click-click-doubleclick | N points |
| Elbow | Drag only (auto-finalizes at 2 points) | 2 points + auto-routed middle |

### Keyboard Modifiers

| Key | During Creation | During Editing |
|-----|----------------|----------------|
| **Shift** | Lock angle to 15° increments | Lock drag to 15° angles |
| **Ctrl/Cmd** | Disable grid snap + binding | Disable grid snap |
| **Alt** | Mark arrow as starting inside shape | Add/move uncommitted point |

### Finalization

- Element must have ≥ 2 points
- Invisible elements (<0.1px) discarded
- Points normalized (first → [0,0])
- `newElement` cleared, element added to scene

---

## 10. Hit Testing

### Two-Stage Approach

```
Stage 1 (Fast): Bounding box test
  → Reject 99% of non-hits immediately
  → Include threshold padding around bounds

Stage 2 (Precise): Distance calculation
  → Decompose arrow into line segments + Bezier curves
  → Calculate minimum distance to any segment/curve
  → Hit if distance ≤ threshold
```

### Distance to Curve (Ternary Search)

```typescript
// 1. Coarse: sample 30 points along curve, find closest
// 2. Fine: ternary search around closest sample
//    while (range > 1e-3) {
//      mid = (min + max) / 2
//      if dist(t=mid-ε) < dist(t=mid+ε) → search left
//      else → search right
//    }
// 3. Return distance to closest point on curve
```

### Point Handle Hit Detection

```typescript
tolerance = (POINT_HANDLE_SIZE + 1) / zoom.value  // ~11px at 100%
// Iterate points BACKWARD (frontmost wins)
// Return index if pointDistance(cursor, point) ≤ tolerance
```

### Segment Midpoint Detection

- Midpoints shown only on segments long enough: `length * zoom ≥ POINT_HANDLE_SIZE * 4`
- Hysteresis: once hovering a midpoint, keeps it selected within threshold (reduces jitter)
- Elbow arrows: midpoint = center of segment; Curved: midpoint at 50% curve length

---

## 11. Constants Reference

| Constant | Value | Purpose |
|----------|-------|---------|
| `BASE_BINDING_GAP` | 5px | Arrow-to-element spacing |
| `BASE_BINDING_GAP_ELBOW` | 5px | Elbow arrow spacing |
| `maxBindingDistance` | 15–30px | Binding hover detection range |
| `LINE_CONFIRM_THRESHOLD` | 8px | Distance to commit new point |
| `SHIFT_LOCKING_ANGLE` | π/12 (15°) | Angle snap increment |
| `DRAGGING_THRESHOLD` | 5px | Minimum drag before action |
| `POINT_HANDLE_SIZE` | 10px | Control point visual size |
| `BASE_PADDING` | 40px | Elbow min distance from element |
| `DEDUP_THRESHOLD` | 1px | Minimum elbow segment length |
| `ELBOW_CORNER_RADIUS` | 16px | Rounded corner radius for elbow |
| `DEFAULT_PROPORTIONAL_RADIUS` | 0.25 | Default curve tightness |
| `CATMULL_ROM_TENSION` | 0.5 | Curve smoothness parameter |
| `ARROWHEAD_TANGENT_T` | 0.3 | Bezier parameter for arrowhead angle |

### Arrowhead Size Table

| Type | Size | Angle | Scale Factor |
|------|------|-------|-------------|
| `arrow` | 25px | 20° | 0.5 |
| `bar` | 15px | 90° | 0.5 |
| `circle` / `circle_outline` | 15px | — | 0.5 |
| `triangle` / `triangle_outline` | 15px | 25° | 0.5 |
| `diamond` / `diamond_outline` | 12px | 25° | 0.25 |
| `crowfoot_*` | 20px | — | 0.5 |

### Roughness Levels

| Level | Value | Name | Effect |
|-------|-------|------|--------|
| 0 | 0 | Architect | Clean, precise lines |
| 1 | 1 | Artist | Slight hand-drawn wobble |
| 2 | 2 | Cartoonist | Heavy hand-drawn effect |

---

## Source Files Reference

| File | Size | Purpose |
|------|------|---------|
| `packages/element/src/types.ts` | 13KB | Type definitions for all elements |
| `packages/element/src/binding.ts` | 83KB | Binding system (detection, update, unbind) |
| `packages/element/src/linearElementEditor.ts` | 71KB | Interactive point editor |
| `packages/element/src/elbowArrow.ts` | 64KB | A* routing for elbow arrows |
| `packages/element/src/shape.ts` | 31KB | Shape generation from element data |
| `packages/element/src/renderElement.ts` | 35KB | Canvas rendering |
| `packages/element/src/bounds.ts` | 34KB | Bounding box & arrowhead math |
| `packages/element/src/collision.ts` | 23KB | Hit testing |
| `packages/element/src/distance.ts` | 5KB | Distance calculations |
| `packages/element/src/heading.ts` | 7KB | Cardinal direction system |
| `packages/element/src/arrows/focus.ts` | 15KB | Focus point calculation |
| `packages/element/src/arrows/helpers.ts` | 1.4KB | Arrow utility functions |
| `packages/element/src/newElement.ts` | 14KB | Element creation with defaults |
| `packages/math/src/curve.ts` | — | Bezier curve math |
| `packages/excalidraw/components/App.tsx` | — | Main app pointer event handling |
