# Arrow Technical Specification

> Reverse-engineered from Excalidraw source code. Use as the authoritative reference when implementing arrows in our Nuxt/Vue canvas.
>
> **Source root:** `excalidraw/packages/` (git-ignored, reference only)

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

> **Core sources:**
> - `element/src/types.ts` — all element type definitions
> - `element/src/newElement.ts` — `newArrowElement()` factory with defaults
> - `element/src/typeChecks.ts` — type guard functions
> - `element/src/arrows/helpers.ts` — arrow utility functions

### ExcalidrawArrowElement (Full Type)

<!-- Source: element/src/types.ts — ExcalidrawArrowElement, ExcalidrawLinearElement, _ExcalidrawElementBase -->

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

<!-- Source: element/src/types.ts — ExcalidrawElbowArrowElement, FixedSegment -->

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

<!-- Source: element/src/types.ts — FixedPointBinding, FixedPoint, BindMode -->

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

<!-- Source: element/src/types.ts — Arrowhead union type -->

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

> **Core sources:**
> - `element/src/typeChecks.ts` — `isArrowElement()`, `isElbowArrow()`, `isSimpleArrow()`, `isSharpArrow()`, `isCurvedArrow()`
> - `element/src/types.ts` — `ExcalidrawLinearElementSubType`

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

> **Core sources:**
> - `element/src/linearElementEditor.ts` — `getPointGlobalCoordinates()` (~line 1207), `pointFromAbsoluteCoords()` (~line 1265), `createPointAt()` (~line 1317), `getNormalizedPoints()` (~line 96)
> - `element/src/binding.ts` — `getGlobalFixedPointForBindableElement()` (~line 2337)
> - `math/src/point.ts` — `pointRotateRads()`, `pointFrom()`

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

<!-- Source: element/src/linearElementEditor.ts — getPointGlobalCoordinates(), pointFromAbsoluteCoords() -->

```typescript
// Local → Global (getPointGlobalCoordinates)
globalX = arrow.x + localPoint[0]
globalY = arrow.y + localPoint[1]
// (then rotate around element center by arrow.angle)

// Global → Local (pointFromAbsoluteCoords)
// (rotate point by -arrow.angle around element center)
localX = rotatedGlobalX - arrow.x
localY = rotatedGlobalY - arrow.y
```

**Normalization** (`getNormalizedPoints` in `linearElementEditor.ts`): When points change, first point is shifted to `[0,0]` and `arrow.x/y` is adjusted by the offset. This maintains the invariant.

### FixedPoint Coordinates (Binding)

<!-- Source: element/src/binding.ts — getGlobalFixedPointForBindableElement() (~line 2337) -->

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

> **Core sources:**
> - `element/src/binding.ts` (83KB) — the entire binding system
>   - `getHoveredElementForBinding()` — detection during drag
>   - `maxBindingDistance_simple()` — hover threshold
>   - `getBindingGap()` (~line 121) — gap calculation
>   - `bindingStrategyForNewSimpleArrowEndpointDragging()` (~line 288) — creation binding
>   - `getBindingStrategyForDraggingBindingElementEndpoints_simple()` (~line 602) — drag binding
>   - `updateBoundElements()` (~line 1066) — maintenance on element move
>   - `unbindBindingElement()` (~line 1032) — explicit unbinding
>   - `bindPointToSnapToElementOutline()` (~line 1326) — edge intersection snapping
>   - `calculateFixedPointForElbowArrowBinding()` (~line 1843) — elbow binding
> - `element/src/arrows/focus.ts` (15KB) — focus point visibility, hover, drag
> - `element/src/collision.ts` — `intersectElementWithLineSegment()` (~line 412), `bindingBorderTest()` (~line 270)

### How Binding Works

```
┌─────────────────────────────────────────────────────┐
│              BINDING LIFECYCLE                       │
│                                                     │
│  1. DETECTION                                       │
│     Arrow endpoint within maxBindingDistance (15-30px)│
│     of a bindable element → show highlight          │
│     → binding.ts: getHoveredElementForBinding()     │
│                                                     │
│  2. COMMITMENT                                      │
│     On pointerUp → create FixedPointBinding         │
│     Store fixedPoint ratio + mode                   │
│     → binding.ts: bindingStrategy*() functions      │
│                                                     │
│  3. MAINTENANCE                                     │
│     Bound element moves → updateBoundElements()     │
│     Arrow endpoint recalculated from fixedPoint     │
│     → binding.ts:1066                               │
│                                                     │
│  4. UNBINDING                                       │
│     Drag beyond threshold / delete target / disable │
│     → set binding to null                           │
│     → binding.ts: unbindBindingElement() (~line 1032)│
└─────────────────────────────────────────────────────┘
```

### Detection Thresholds

<!-- Source: element/src/binding.ts — maxBindingDistance_simple() -->

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

<!-- Source: element/src/binding.ts — getBindingGap() (~line 121), BASE_BINDING_GAP, BASE_BINDING_GAP_ELBOW -->

```typescript
getBindingGap(target, arrow) {
  return (arrow.elbowed ? 5 : 5) + target.strokeWidth / 2
}
```

Gap = `5px + strokeWidth/2` — visual separation between arrowhead and element edge.

### Binding Modes by Context

<!-- Source: element/src/binding.ts — bindingStrategyForNewSimpleArrowEndpointDragging() (~line 288), getBindingStrategyForDraggingBindingElementEndpoints_simple() (~line 602) -->

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

<!-- Source: element/src/collision.ts — intersectElementWithLineSegment() (~line 412) -->

How the arrow meets the element edge:

```typescript
// collision.ts:412 — intersectElementWithLineSegment()
intersectElementWithLineSegment(element, line, offset) {
  // 1. Fast: bounding box rejection test (doBoundsIntersect)
  // 2. Slow: shape-specific intersection
  switch (element.type) {
    case 'rectangle': // intersectRectanguloidWithLineSegment() — 4 edges
    case 'diamond':   // intersectDiamondWithLineSegment() — 4 diagonal edges
    case 'ellipse':   // intersectEllipseWithLineSegment() — bezier curves
  }
}
```

<!-- Source: element/src/binding.ts — bindPointToSnapToElementOutline() (~line 1326) -->

Snapping to outline: `bindPointToSnapToElementOutline()` creates a line from the adjacent arrow point through the fixedPoint, extends it beyond the element, then finds where it intersects the element boundary (including binding gap offset).

### Update on Element Move

<!-- Source: element/src/binding.ts — updateBoundElements() (~line 1066), updateBoundPoint() (~line 1672) -->

When a bound element moves:
1. `updateBoundElements()` iterates `element.boundElements[]` for all arrows
2. For each arrow, `updateBoundPoint()` recalculates endpoint from stored `fixedPoint` ratio
3. Calls `LinearElementEditor.movePoints()` with new positions
4. If arrow becomes very short (<40px between elements) → switch to `inside` mode

---

## 5. Curve Generation & Rendering

> **Core sources:**
> - `element/src/shape.ts` (31KB) — `ShapeCache.generateElementShape()`, `generateRoughOptions()`, `getArrowheadShapes()`, `generateElbowArrowShape()`
> - `element/src/renderElement.ts` (35KB) — `drawElementOnCanvas()`, `generateElementCanvas()`
> - `math/src/curve.ts` — `curveCatmullRomCubicApproxPoints()`, `bezierEquation()`, `curveClosestPoint()`, `curveLength()`

### Pipeline Overview

```
Element Data
    ↓
Shape Generation (element/src/shape.ts — ShapeCache.generateElementShape)
    ↓ sharp: roughjs.linearPath(points)
    ↓ round: roughjs.curve(points)      ← Catmull-Rom
    ↓ elbow: roughjs.path(svgPath)      ← SVG with Q curves at corners
    ↓
RoughJS Processing (roughjs library)
    ↓ Applies hand-drawn noise (seed-based)
    ↓ Applies dash patterns if needed
    ↓ Generates canvas operations (moveTo, lineTo, bezierCurveTo)
    ↓
Arrowhead Generation (element/src/shape.ts — getArrowheadShapes)
    ↓ Extracts curve tangent at t=0.3  (element/src/bounds.ts — getArrowheadPoints)
    ↓ Calculates arrowhead geometry
    ↓ Renders via RoughJS (circle, polygon, line)
    ↓
Canvas Rendering (element/src/renderElement.ts — drawElementOnCanvas)
    ↓ context.lineJoin = "round"
    ↓ context.lineCap = "round"
    ↓ rc.draw(shape)  ← RoughJS executes operations
    ↓
Rendered Arrow on Screen
```

### Catmull-Rom Cubic Approximation (Curved Arrows)

<!-- Source: math/src/curve.ts — curveCatmullRomCubicApproxPoints() -->

For each pair of consecutive points, generates a cubic Bezier curve:

```
Given points p0, p1, p2, p3 with tension τ = 0.5:

tangent₁ = (p₂ - p₀) × τ
tangent₂ = (p₃ - p₁) × τ

controlPoint1 = p₁ + tangent₁ / 3
controlPoint2 = p₂ - tangent₂ / 3

Bezier curve: [p₁, cp1, cp2, p₂]
```

The cubic Bezier equation (`math/src/curve.ts` — `bezierEquation()`):
```
B(t) = (1-t)³·P₀ + 3(1-t)²t·P₁ + 3(1-t)t²·P₂ + t³·P₃
```

### Elbow Arrow Shape (Rounded Corners)

<!-- Source: element/src/shape.ts — generateElbowArrowShape() -->

Elbow corners use quadratic Bezier curves with radius = 16px:

```typescript
cornerRadius = Math.min(16, dist_to_next / 2, dist_to_prev / 2)
// SVG path: L <before_corner> Q <corner_point> <after_corner>
```

### RoughJS Options

<!-- Source: element/src/shape.ts — generateRoughOptions() -->

```typescript
{
  seed: element.seed,           // Deterministic randomness
  roughness: adjustedRoughness, // Reduced for small elements (adjustRoughness())
  strokeLineDash:
    dashed → [8, 8 + strokeWidth]       // getDashArrayDashed()
    dotted → [1.5, 6 + strokeWidth]     // getDashArrayDotted()
    solid  → undefined,
  disableMultiStroke: strokeStyle !== 'solid',
  strokeWidth: strokeStyle === 'solid' ? sw : sw + 0.5,
  preserveVertices: roughness < 2,  // Keep vertices exact for clean arrows
}
```

### Shape Caching

<!-- Source: element/src/shape.ts — ShapeCache class (WeakMap) -->

Shapes are cached in a `WeakMap<Element, Shape>` and only regenerated when:
- Element version changes
- Zoom level changes
- Theme changes (dark mode)

---

## 6. Arrowhead Geometry

> **Core sources:**
> - `element/src/bounds.ts` — `getArrowheadPoints()`, `getArrowheadSize()`, `getArrowheadAngle()`
> - `element/src/shape.ts` — `getArrowheadShapes()` (renders each type via roughjs)

### Size and Angle by Type

<!-- Source: element/src/bounds.ts — getArrowheadSize(), getArrowheadAngle() -->

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

<!-- Source: element/src/bounds.ts — getArrowheadPoints(), lengthMultiplier logic -->

Arrowheads scale down if the last segment is too short:

```typescript
lengthMultiplier = (diamond | diamond_outline) ? 0.25 : 0.5
actualSize = Math.min(arrowheadSize, lastSegmentLength * lengthMultiplier)
```

### Orientation Calculation

<!-- Source: element/src/bounds.ts — getArrowheadPoints(), Bezier evaluation at t=0.3 -->

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

> **Core sources:**
> - `element/src/elbowArrow.ts` (64KB) — the entire elbow routing system
>   - `updateElbowArrowPoints()` (~line 906) — entry point
>   - `routeElbowArrow()` (~line 1430) — runs A* with grid
>   - `astar()` (~line 1531) — A* pathfinding implementation
>   - `calculateGrid()` (~line 1847) — non-uniform grid builder
>   - `generateDynamicAABBs()` (~line 1662) — obstacle zone generation
>   - `getDonglePosition()` (~line 1904) — element exit point
>   - `getElbowArrowCornerPoints()` (~line 2184) — corner extraction
>   - `removeElbowArrowShortSegments()` (~line 2212) — short segment cleanup
>   - `normalizeArrowElementUpdate()` (~line 2130) — local coord conversion
>   - `getElbowArrowData()` (~line 1189) — route data preparation
>   - `estimateSegmentCount()` (~line 1923) — heuristic bend count
>   - `handleSegmentRenormalization()` (~line 113) — cleanup with fixed segments
>   - `handleSegmentRelease()` (~line 282) — refill after segment unfix
>   - `handleSegmentMove()` (~line 465) — drag fixed segment
>   - `handleEndpointDrag()` (~line 705) — endpoint drag with fixed segments
>   - `validateElbowPoints()` (~line 2323) — orthogonality check
> - `element/src/heading.ts` (7KB) — cardinal direction system
>   - `headingForPointFromElement()` (~line 231) — which edge to bind to
>   - `vectorToHeading()` — vector → cardinal direction
>   - `flipHeading()`, `compareHeading()`, `headingIsHorizontal()`

### Algorithm: Modified A* Pathfinding

<!-- Source: element/src/elbowArrow.ts — routeElbowArrow() (~line 1430), astar() (~line 1531) -->

```
┌──────────────────────────────────────────────────────────────┐
│                   ELBOW ARROW PIPELINE                       │
│                                                              │
│  getElbowArrowData() (line 1189)                             │
│    ├─ Determine start/end binding elements                   │
│    ├─ Calculate startHeading & endHeading                    │
│    └─ Generate dynamicAABBs, donglePositions, commonBounds   │
│                                                              │
│  routeElbowArrow() (line 1430)                               │
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

<!-- Source: element/src/elbowArrow.ts — calculateGrid() (~line 1847) -->

**Non-uniform grid** built from obstacle boundaries:

```typescript
// Grid lines placed at:
// - Start/end constraint points (based on heading)
// - All obstacle AABB edges (left, right, top, bottom)
// - Common bounding box edges

// Result: variable-resolution grid that snaps to obstacle edges
```

### Heading System

<!-- Source: element/src/heading.ts — HEADING_* constants (lines 31-35) -->

```typescript
HEADING_RIGHT = [1, 0]
HEADING_DOWN  = [0, 1]
HEADING_LEFT  = [-1, 0]
HEADING_UP    = [0, -1]
```

Exit/entry direction determined by `headingForPointFromElement()` (`heading.ts` ~line 231):
- Uses triangle "search cones" from element center (SEARCH_CONE_MULTIPLIER = 2)
- Cross-product test determines which quadrant the target is in
- Returns the edge direction toward that quadrant

### A* Cost Function

<!-- Source: element/src/elbowArrow.ts — astar() (~line 1531), cost calculation lines 1600-1620 -->

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

<!-- Source: element/src/elbowArrow.ts — generateDynamicAABBs() (~line 1662), midpoint collision (line 1578), getDonglePosition() (~line 1904) -->

- **Dynamic AABBs** (`generateDynamicAABBs()`) around bound elements expand/contract based on heading
- Midpoint collision test (~line 1578): path blocked if midpoint between nodes intersects any AABB
- **Dongle positions** (`getDonglePosition()`): path starts/ends at element edge (not center)
- No backtracking: reverse direction explicitly forbidden (`flipHeading()` check)

### Fixed Segments (User-Anchored)

<!-- Source: element/src/elbowArrow.ts — handleSegmentMove() (~line 465), handleSegmentRelease() (~line 282), validation (~line 956) -->

- Users drag segments to lock them in place (`handleSegmentMove()`)
- First and last segments CANNOT be fixed (validated at ~line 956)
- Each fixed segment must be purely horizontal OR vertical
- When fixed segments exist, only non-fixed parts are rerouted
- `BASE_PADDING = 40px` (~line 111) minimum distance from element to route start

### Validation

<!-- Source: element/src/elbowArrow.ts — validateElbowPoints() (~line 2323) -->

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

> **Core sources:**
> - `element/src/linearElementEditor.ts` (71KB) — the entire interactive editor
>   - Class definition with state fields (~top of file)
>   - `handlePointerDown()` (~line 959) — click on points/segments
>   - `handlePointerMove()` (~line 290) — endpoint drag during creation
>   - `handlePointDragging()` (~line 427) — existing point drag
>   - `handlePointerUp()` (~line 643) — finalize drag
>   - `handlePointerMoveInEditMode()` (~line 1127) — freehand creation
>   - `getPointIndexUnderCursor()` (~line 1289) — point hit test
>   - `getSegmentMidpointHitCoords()` (~line 781) — midpoint hit test
>   - `getSegmentMidPoint()` (~line 891) — midpoint calculation
>   - `shouldAddMidpoint()` (~line 1586) — midpoint add check
>   - `addMidpoint()` (~line 1631) — insert point
>   - `deletePoints()` (~line 1432) — remove points
>   - `getPointGlobalCoordinates()` (~line 1207) — local→global
>   - `pointFromAbsoluteCoords()` (~line 1265) — global→local
>   - `createPointAt()` (~line 1317) — new point from screen coords
>   - `movePoints()` — update positions with normalization

### Editor State

<!-- Source: element/src/linearElementEditor.ts — class fields at top -->

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

  // Interaction state (initialState)
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

<!-- Source: element/src/linearElementEditor.ts — various functions referenced below -->

| Operation | Mechanism | Source |
|-----------|-----------|--------|
| **Select point** | Click within `(POINT_HANDLE_SIZE + 1) / zoom` ≈ 11px | `getPointIndexUnderCursor()` ~line 1289 |
| **Multi-select** | Shift+click toggles individual points | `handlePointerDown()` ~line 1076 |
| **Drag point** | Updates position, recalculates bindings | `handlePointDragging()` ~line 427 |
| **Add midpoint** | Hover segment center, drag when beyond threshold | `shouldAddMidpoint()` ~line 1586, `addMidpoint()` ~line 1631 |
| **Delete point** | Keyboard delete, filters point from array | `deletePoints()` ~line 1432 |
| **Shift+drag** | Locks angle to 15° increments | `_getShiftLockedDelta()` |

### Last Uncommitted Point

<!-- Source: element/src/linearElementEditor.ts — handlePointerMoveInEditMode() (~line 1127), lines 1147-1199 -->

During creation, the most recent point hasn't been finalized yet:

```
Alt+move → lastUncommittedPoint = new point (live preview)
Alt+move again → same point MOVES (not a new point)
Release Alt → uncommitted point DELETED
Alt+click → point COMMITTED → lastUncommittedPoint = null
```

This enables smooth "preview" creation without intermediate artifacts.

### Coordinate Handling

Points iterate backward for hit detection (rightmost/top point wins on overlap — `getPointIndexUnderCursor()` ~line 1304).
Elbow arrows restrict selection to endpoints only (middle points auto-computed — `handlePointDragging()` ~line 450).

---

## 9. Creation Interaction Flow

> **Core sources:**
> - `excalidraw/components/App.tsx` — `handleLinearElementOnPointerDown()` (~line 8502), pointer event handlers
> - `element/src/linearElementEditor.ts` — `handlePointerMove()` (~line 290), `handlePointerUp()` (~line 643)
> - `element/src/sizeHelpers.ts` — `getLockedLinearCursorAlignSize()` (~line 156), angle snapping
> - `element/src/dragElements.ts` — `dragSelectedElements()`, arrow movement
> - `element/src/resizeElements.ts` — endpoint resize/drag
> - `common/src/constants.ts` — `ARROW_TYPE`, `LINE_CONFIRM_THRESHOLD`, `SHIFT_LOCKING_ANGLE`

### State Machine

<!-- Source: excalidraw/components/App.tsx — handleLinearElementOnPointerDown() (~line 8502) -->

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
  │  → App.tsx: handleLinearElementOnPointerDown()
  │  pointerMove
  ▼
DRAGGING_ENDPOINT
  │  LinearElementEditor.handlePointerMove() updates last point
  │  Binding hover detection active
  │
  ├── pointerUp (drag-to-create) → FINALIZED (2-point arrow)
  │
  ├── pointerDown (click pattern, dist > LINE_CONFIRM_THRESHOLD=8px) → ADD_POINT
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

<!-- Source: element/src/sizeHelpers.ts — getLockedLinearCursorAlignSize() (~line 156), SHIFT_LOCKING_ANGLE = π/12 -->

| Key | During Creation | During Editing |
|-----|----------------|----------------|
| **Shift** | Lock angle to 15° increments (`getLockedLinearCursorAlignSize()` in `sizeHelpers.ts`) | Lock drag to 15° angles |
| **Ctrl/Cmd** | Disable grid snap + binding | Disable grid snap |
| **Alt** | Mark arrow as starting inside shape (`arrowStartIsInside`) | Add/move uncommitted point |

### Finalization

<!-- Source: excalidraw/components/App.tsx — actionFinalize -->

- Element must have ≥ 2 points
- Invisible elements (<0.1px) discarded
- Points normalized (first → [0,0])
- `newElement` cleared, element added to scene

---

## 10. Hit Testing

> **Core sources:**
> - `element/src/collision.ts` (23KB) — `hitElementItself()`, `isPointOnElementOutline()`
> - `element/src/distance.ts` (5KB) — `distanceToLinearOrFreeDraElement()`
> - `math/src/curve.ts` — `curveClosestPoint()`, `curvePointDistance()`
> - `element/src/bounds.ts` — `getElementBounds()`, bounding box functions
> - `element/src/linearElementEditor.ts` — `getPointIndexUnderCursor()` (~line 1289), `getSegmentMidpointHitCoords()` (~line 781), `isSegmentTooShort()` (~line 854)

### Two-Stage Approach

<!-- Source: element/src/collision.ts — hitElementItself() -->

```
Stage 1 (Fast): Bounding box test (getElementBounds + isPointWithinBounds)
  → Reject 99% of non-hits immediately
  → Include threshold padding around bounds

Stage 2 (Precise): Distance calculation (isPointOnElementOutline → distanceToElement)
  → Decompose arrow into line segments + Bezier curves
  → Calculate minimum distance to any segment/curve
  → Hit if distance ≤ threshold
```

### Distance to Curve (Ternary Search)

<!-- Source: math/src/curve.ts — curveClosestPoint(), curvePointDistance() -->

```typescript
// 1. Coarse: sample 30 points along curve, find closest (curveClosestPoint)
// 2. Fine: ternary search around closest sample (localMinimum)
//    while (range > 1e-3) {
//      mid = (min + max) / 2
//      if dist(t=mid-ε) < dist(t=mid+ε) → search left
//      else → search right
//    }
// 3. Return distance to closest point on curve
```

### Point Handle Hit Detection

<!-- Source: element/src/linearElementEditor.ts — getPointIndexUnderCursor() (~line 1289) -->

```typescript
tolerance = (POINT_HANDLE_SIZE + 1) / zoom.value  // ~11px at 100%
// Iterate points BACKWARD (frontmost wins — line 1304)
// Return index if pointDistance(cursor, point) ≤ tolerance
```

### Segment Midpoint Detection

<!-- Source: element/src/linearElementEditor.ts — getSegmentMidpointHitCoords() (~line 781), isSegmentTooShort() (~line 854) -->

- Midpoints shown only on segments long enough: `length * zoom ≥ POINT_HANDLE_SIZE * 4`
- Hysteresis: once hovering a midpoint, keeps it selected within threshold (reduces jitter — lines 817-830)
- Elbow arrows: midpoint = center of segment; Curved: midpoint at 50% curve length

---

## 11. Constants Reference

| Constant | Value | Source |
|----------|-------|--------|
| `BASE_BINDING_GAP` | 5px | `element/src/binding.ts` ~line 121 |
| `BASE_BINDING_GAP_ELBOW` | 5px | `element/src/binding.ts` ~line 121 |
| `maxBindingDistance` | 15–30px | `element/src/binding.ts` — `maxBindingDistance_simple()` |
| `LINE_CONFIRM_THRESHOLD` | 8px | `common/src/constants.ts` |
| `SHIFT_LOCKING_ANGLE` | π/12 (15°) | `common/src/constants.ts` |
| `DRAGGING_THRESHOLD` | 5px | `common/src/constants.ts` |
| `POINT_HANDLE_SIZE` | 10px | `element/src/linearElementEditor.ts` |
| `BASE_PADDING` | 40px | `element/src/elbowArrow.ts` ~line 111 |
| `DEDUP_THRESHOLD` | 1px | `element/src/elbowArrow.ts` ~line 110 |
| `ELBOW_CORNER_RADIUS` | 16px | `element/src/shape.ts` — `generateElbowArrowShape()` |
| `DEFAULT_PROPORTIONAL_RADIUS` | 0.25 | `element/src/types.ts` |
| `CATMULL_ROM_TENSION` | 0.5 | `math/src/curve.ts` — `curveCatmullRomCubicApproxPoints()` |
| `ARROWHEAD_TANGENT_T` | 0.3 | `element/src/bounds.ts` — `getArrowheadPoints()` |
| `SEARCH_CONE_MULTIPLIER` | 2 | `element/src/heading.ts` |

### Arrowhead Size Table

<!-- Source: element/src/bounds.ts — getArrowheadSize(), getArrowheadAngle() -->

| Type | Size | Angle | Scale Factor |
|------|------|-------|-------------|
| `arrow` | 25px | 20° | 0.5 |
| `bar` | 15px | 90° | 0.5 |
| `circle` / `circle_outline` | 15px | — | 0.5 |
| `triangle` / `triangle_outline` | 15px | 25° | 0.5 |
| `diamond` / `diamond_outline` | 12px | 25° | 0.25 |
| `crowfoot_*` | 20px | — | 0.5 |

### Roughness Levels

<!-- Source: common/src/constants.ts — ROUGHNESS -->

| Level | Value | Name | Effect |
|-------|-------|------|--------|
| 0 | 0 | Architect | Clean, precise lines |
| 1 | 1 | Artist | Slight hand-drawn wobble |
| 2 | 2 | Cartoonist | Heavy hand-drawn effect |

---

## Source Files Quick Reference

> All paths relative to `excalidraw/packages/`. Browse these files directly for implementation details.

| File | Size | Purpose |
|------|------|---------|
| `element/src/types.ts` | 13KB | Type definitions for all elements |
| `element/src/newElement.ts` | 14KB | Element creation with defaults |
| `element/src/typeChecks.ts` | 10KB | Type guard functions |
| `element/src/binding.ts` | 83KB | Binding system (detection, update, unbind) |
| `element/src/linearElementEditor.ts` | 71KB | Interactive point editor |
| `element/src/elbowArrow.ts` | 64KB | A* routing for elbow arrows |
| `element/src/shape.ts` | 31KB | Shape generation from element data |
| `element/src/renderElement.ts` | 35KB | Canvas rendering |
| `element/src/bounds.ts` | 34KB | Bounding box & arrowhead math |
| `element/src/collision.ts` | 23KB | Hit testing |
| `element/src/distance.ts` | 5KB | Distance calculations |
| `element/src/heading.ts` | 7KB | Cardinal direction system |
| `element/src/arrows/focus.ts` | 15KB | Focus point calculation |
| `element/src/arrows/helpers.ts` | 1.4KB | Arrow utility functions |
| `element/src/sizeHelpers.ts` | 7KB | Angle snapping (`getLockedLinearCursorAlignSize`) |
| `element/src/dragElements.ts` | 10KB | Element dragging |
| `element/src/resizeElements.ts` | 42KB | Resize & endpoint dragging |
| `math/src/curve.ts` | — | Bezier curve math (Catmull-Rom, closest point, length) |
| `math/src/point.ts` | — | Point math (rotate, distance, scale) |
| `math/src/vector.ts` | — | Vector math (normalize, scale, fromPoint) |
| `math/src/segment.ts` | — | Line segment operations |
| `common/src/constants.ts` | — | Shared constants (thresholds, angles) |
| `excalidraw/components/App.tsx` | — | Main app pointer event handling |
